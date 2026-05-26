import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../../../shared/database/database.module';
import type { DrizzleClient } from '../../../shared/database/database.module';
import { customers } from '../../../shared/database/schema';

const BCRYPT_ROUNDS = 12;
const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';

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

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const [customer] = await this.db
      .insert(customers)
      .values({ email, passwordHash, organizationId: orgId })
      .returning();
    return customer;
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

  private issueToken(customerId: string, orgId: string, expiresIn: string) {
    return jwt.sign(
      { sub: customerId, organizationId: orgId },
      this.jwtSecret,
      { expiresIn } as jwt.SignOptions,
    );
  }
}
