import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../../../shared/database/database.module';
import type { DrizzleClient } from '../../../shared/database/database.module';
import {
  adminUsers,
  organizations,
  organizationMembers,
  adminSessions,
} from '../../../shared/database/schema';
import { generateUniqueSlug } from '../../../shared/utils/slug.util';
import type { TenantContext } from '../../../shared/tenant/tenant-context';

const BCRYPT_ROUNDS = 12;
// Keep in sync with ACCESS_MAX_AGE / REFRESH_MAX_AGE in apps/frontend/src/server/auth.ts:
// the backend decides if a token is valid, the cookie decides if the browser still
// holds it — if they drift, the browser sends tokens the server has already rejected.
const ACCESS_TTL = '1h';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type AdminRole = NonNullable<TenantContext['role']>;

/** Claims carried by the self-issued admin access token. Shape mirrors what
 *  AdminAuthGuard used to read from the WorkOS JWT, so nothing downstream changed. */
export interface AdminAccessClaims {
  sub: string; // admin_user_id
  org_id: string; // local organization UUID
  role: AdminRole;
  email: string;
}

export interface AdminSessionResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string | null };
  organizationId: string;
  role: AdminRole;
}

@Injectable()
export class AdminAuthService {
  private readonly jwtSecret: string;

  constructor(
    private readonly config: ConfigService,
    @Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient,
  ) {
    this.jwtSecret = config.getOrThrow<string>('ADMIN_JWT_SECRET');
  }

  // ─── Registration (self-serve: user + org + super_admin membership) ─────────

  /**
   * Self-serve signup. Creates the admin user, their organization, and a
   * super_admin membership, then issues a session. The neon-http driver has no
   * interactive transactions (see the rest of the codebase), so inserts run
   * sequentially; the unique email constraint guards against duplicate users.
   */
  async register(
    email: string,
    password: string,
    orgName?: string,
  ): Promise<AdminSessionResult> {
    await this.assertEmailAvailable(email);

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const [user] = await this.db
      .insert(adminUsers)
      .values({ email, passwordHash, lastLoginAt: new Date() })
      .returning();

    const name = orgName?.trim() || `${email.split('@')[0]}'s Organization`;
    const slug = await generateUniqueSlug(name, (s) => this.orgSlugTaken(s));
    const [org] = await this.db
      .insert(organizations)
      .values({ name, slug })
      .returning();

    await this.db.insert(organizationMembers).values({
      organizationId: org.id,
      adminUserId: user.id,
      role: 'super_admin',
    });

    return this.issueSession(user, org.id, 'super_admin');
  }

  // ─── Login ──────────────────────────────────────────────────────────────────

  async login(email: string, password: string): Promise<AdminSessionResult> {
    const [user] = await this.db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email))
      .limit(1);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const membership = await this.defaultMembership(user.id);
    if (!membership) {
      throw new UnauthorizedException('User has no organization membership');
    }

    await this.db
      .update(adminUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(adminUsers.id, user.id));

    return this.issueSession(user, membership.organizationId, membership.role);
  }

  // ─── Refresh (rotates the refresh token) ────────────────────────────────────

  /**
   * Validate a refresh token against admin_sessions, rotate it (revoke the old
   * row, insert a new one), and re-issue an access token. The new access token
   * targets the user's default membership with the role read fresh from the DB,
   * so role changes take effect on the next refresh.
   */
  async refresh(rawRefreshToken: string): Promise<AdminSessionResult> {
    const tokenHash = this.hashToken(rawRefreshToken);
    const [session] = await this.db
      .select()
      .from(adminSessions)
      .where(
        and(
          eq(adminSessions.refreshTokenHash, tokenHash),
          isNull(adminSessions.revokedAt),
          gt(adminSessions.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const [user] = await this.db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, session.adminUserId))
      .limit(1);

    const membership = user ? await this.defaultMembership(user.id) : undefined;
    if (!user || !membership) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    // Rotate: revoke the presented token before minting a replacement.
    await this.db
      .update(adminSessions)
      .set({ revokedAt: new Date() })
      .where(eq(adminSessions.id, session.id));

    return this.issueSession(user, membership.organizationId, membership.role);
  }

  // ─── Logout (revoke a single refresh token) ─────────────────────────────────

  async logout(rawRefreshToken: string): Promise<void> {
    await this.db
      .update(adminSessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(adminSessions.refreshTokenHash, this.hashToken(rawRefreshToken)),
          isNull(adminSessions.revokedAt),
        ),
      );
  }

  // ─── Token verification (called by AdminAuthGuard) ──────────────────────────

  verifyAccess(token: string): AdminAccessClaims {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as jwt.JwtPayload;
      return {
        sub: payload.sub as string,
        org_id: payload.org_id as string,
        role: payload.role as AdminRole,
        email: payload.email as string,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  // ─── Current user + memberships (for GET /auth/me) ──────────────────────────

  async getProfile(userId: string) {
    const [user] = await this.db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, userId))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const memberships = await this.db
      .select({
        organizationId: organizationMembers.organizationId,
        organizationName: organizations.name,
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .innerJoin(
        organizations,
        eq(organizations.id, organizationMembers.organizationId),
      )
      .where(eq(organizationMembers.adminUserId, userId));

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      memberships,
    };
  }

  // ─── Internals ──────────────────────────────────────────────────────────────

  private async issueSession(
    user: { id: string; email: string; name: string | null },
    organizationId: string,
    role: AdminRole,
  ): Promise<AdminSessionResult> {
    const accessToken = jwt.sign(
      { org_id: organizationId, role, email: user.email },
      this.jwtSecret,
      { subject: user.id, expiresIn: ACCESS_TTL } as jwt.SignOptions,
    );

    const refreshToken = crypto.randomBytes(32).toString('hex');
    await this.db.insert(adminSessions).values({
      adminUserId: user.id,
      refreshTokenHash: this.hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name },
      organizationId,
      role,
    };
  }

  /** The membership used when a request doesn't name an org — first by join order.
   *  Single-org today; when org-switching lands this becomes the "active" org. */
  private async defaultMembership(userId: string) {
    const [membership] = await this.db
      .select({
        organizationId: organizationMembers.organizationId,
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .where(eq(organizationMembers.adminUserId, userId))
      .limit(1);
    return membership ?? undefined;
  }

  private async assertEmailAvailable(email: string): Promise<void> {
    const [existing] = await this.db
      .select({ id: adminUsers.id })
      .from(adminUsers)
      .where(eq(adminUsers.email, email))
      .limit(1);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
  }

  private async orgSlugTaken(slug: string): Promise<boolean> {
    const [existing] = await this.db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);
    return !!existing;
  }

  /** SHA-256 of the raw refresh token — deterministic so it can be looked up. */
  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }
}
