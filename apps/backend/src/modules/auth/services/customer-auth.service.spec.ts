import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { CustomerAuthService } from './customer-auth.service';
import type { Customer } from '../../../shared/database/schema';

jest.mock('bcrypt');

const orgId = 'org-1';

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'cust-1',
    organizationId: orgId,
    email: 'buyer@example.com',
    passwordHash: 'hashed',
    groupId: null,
    firstName: null,
    lastName: null,
    phone: null,
    status: 'active',
    emailVerified: false,
    marketingOptIn: false,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Builds a Drizzle client mock. Each top-level call (select/update/insert)
 * shifts the next queued value; every chain method returns a thenable that
 * resolves to that value, so awaiting at any terminal point works.
 */
function makeDb(queue: unknown[]) {
  let i = 0;
  function chain() {
    const value = queue[i++];
    const node: Record<string, unknown> = {
      then: (resolve: (v: unknown) => unknown) =>
        Promise.resolve(value).then(resolve),
    };
    for (const m of [
      'from',
      'where',
      'limit',
      'set',
      'returning',
      'values',
      'orderBy',
    ]) {
      node[m] = () => node;
    }
    return node;
  }
  return {
    select: jest.fn(() => chain()),
    update: jest.fn(() => chain()),
    insert: jest.fn(() => chain()),
    delete: jest.fn(() => chain()),
  };
}

function makeService(queue: unknown[]) {
  const config = {
    getOrThrow: () => 'x'.repeat(64),
  } as unknown as ConfigService;
  const db = makeDb(queue);
  const service = new CustomerAuthService(config, db as never);
  return { service, db };
}

describe('CustomerAuthService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('login', () => {
    it('rejects accounts with no password set', async () => {
      const { service } = makeService([[makeCustomer({ passwordHash: null })]]);

      await expect(
        service.login('buyer@example.com', 'secret123', orgId),
      ).rejects.toThrow(new UnauthorizedException('Password not set for this account'));
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('rejects unknown accounts', async () => {
      const { service } = makeService([[]]);

      await expect(
        service.login('nobody@example.com', 'secret123', orgId),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('setPassword', () => {
    it('rejects an invalid / expired / used token (no matching row)', async () => {
      // The repo query filters on hash match + usedAt IS NULL + expiresAt > now,
      // so expired, used, and unknown tokens all surface as "no row".
      const { service } = makeService([[]]);

      await expect(
        service.setPassword('raw-token', 'newpassword'),
      ).rejects.toThrow(new UnauthorizedException('Invalid or expired token'));
    });

    it('sets the password, auto-verifies email, and marks the token used', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
      const tokenRow = {
        id: 'tok-1',
        organizationId: orgId,
        customerId: 'cust-1',
        tokenHash: 'whatever',
        expiresAt: new Date(Date.now() + 1000),
        usedAt: null,
        createdAt: new Date(),
      };
      const updatedCustomer = makeCustomer({
        passwordHash: 'new-hash',
        emailVerified: true,
      });
      // 1: select token, 2: update customer (returning), 3: mark token used
      const { service, db } = makeService([
        [tokenRow],
        [updatedCustomer],
        undefined,
      ]);

      const result = await service.setPassword('raw-token', 'newpassword');

      expect(result).toEqual(updatedCustomer);
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword', 12);
      // one select (token lookup) + two updates (customer, token)
      expect(db.select).toHaveBeenCalledTimes(1);
      expect(db.update).toHaveBeenCalledTimes(2);
    });
  });
});
