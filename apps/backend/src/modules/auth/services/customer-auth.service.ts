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
  customers,
  customerSetPasswordTokens,
} from '../../../shared/database/schema';

const BCRYPT_ROUNDS = 12;
const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';
const SET_PASSWORD_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

@Injectable()
export class CustomerAuthService {
  private readonly jwtSecret: string;

  constructor(
    private readonly config: ConfigService,
    @Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient,
  ) {
    this.jwtSecret = config.getOrThrow<string>('CUSTOMER_JWT_SECRET');
  }

  async register(email: string, password: string, orgId: string) {
    await this.assertEmailAvailable(email, orgId);

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const [customer] = await this.db
      .insert(customers)
      .values({ email, passwordHash, organizationId: orgId })
      .returning();
    return customer;
  }

  /**
   * Admin-created account: insert a customer with no password. The customer
   * sets one later via a set-password token link (see createSetPasswordToken).
   */
  async createByAdmin(email: string, orgId: string) {
    await this.assertEmailAvailable(email, orgId);

    const [customer] = await this.db
      .insert(customers)
      .values({ email, passwordHash: null, organizationId: orgId })
      .returning();
    return customer;
  }

  /**
   * Issue a single-use set-password token. The raw token is returned once (to
   * the admin, who shares the link manually); only its hash is persisted.
   */
  async createSetPasswordToken(customerId: string, orgId: string) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SET_PASSWORD_TTL_MS);

    await this.db.insert(customerSetPasswordTokens).values({
      organizationId: orgId,
      customerId,
      tokenHash: this.hashToken(token),
      expiresAt,
    });

    return { token, expiresAt };
  }

  /**
   * Consume a set-password token: validate it is unused and unexpired, set the
   * customer's password, mark the token used, and auto-verify the email.
   */
  async setPassword(rawToken: string, newPassword: string) {
    const [record] = await this.db
      .select()
      .from(customerSetPasswordTokens)
      .where(
        and(
          eq(customerSetPasswordTokens.tokenHash, this.hashToken(rawToken)),
          isNull(customerSetPasswordTokens.usedAt),
          gt(customerSetPasswordTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!record) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    const [customer] = await this.db
      .update(customers)
      .set({ passwordHash, emailVerified: true, updatedAt: new Date() })
      .where(
        and(
          eq(customers.id, record.customerId),
          eq(customers.organizationId, record.organizationId),
        ),
      )
      .returning();

    await this.db
      .update(customerSetPasswordTokens)
      .set({ usedAt: new Date() })
      .where(eq(customerSetPasswordTokens.id, record.id));

    return customer;
  }

  private async assertEmailAvailable(email: string, orgId: string) {
    const existing = await this.db
      .select()
      .from(customers)
      .where(
        and(eq(customers.email, email), eq(customers.organizationId, orgId)),
      )
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('Email already registered');
    }
  }

  /** SHA-256 of the raw token — deterministic so it can be looked up by index. */
  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  async login(email: string, password: string, orgId: string) {
    const [customer] = await this.db
      .select()
      .from(customers)
      .where(
        and(eq(customers.email, email), eq(customers.organizationId, orgId)),
      )
      .limit(1);

    if (!customer) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!customer.passwordHash) {
      throw new UnauthorizedException('Password not set for this account');
    }

    const valid = await bcrypt.compare(password, customer.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      customer,
      accessToken: this.issueToken(customer.id, orgId, ACCESS_TTL),
      refreshToken: this.issueToken(customer.id, orgId, REFRESH_TTL),
    };
  }

  verifyToken(token: string): { customerId: string; organizationId: string } {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as jwt.JwtPayload;
      return {
        customerId: payload.sub as string,
        organizationId: payload.organizationId as string,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  issueAccessToken(customerId: string, orgId: string): string {
    return this.issueToken(customerId, orgId, ACCESS_TTL);
  }

  private issueToken(customerId: string, orgId: string, expiresIn: string) {
    return jwt.sign(
      { sub: customerId, organizationId: orgId },
      this.jwtSecret,
      { expiresIn } as jwt.SignOptions,
    );
  }
}
