import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import { customers } from '../../schema';
import { VOLUME, type SeedDb } from './config';

export type SeededCustomer = {
  id: string;
  email: string;
  name: string;
};

export const DEMO_PASSWORD = 'Password1!';

/**
 * Storefront customers. All share one bcrypt hash — hashing 200 distinct
 * passwords costs seconds for no test value, and the plaintext is printed at
 * the end of the seed so any of them can be logged into.
 */
export async function seedCustomers(
  db: SeedDb,
  orgId: string,
  createdAtFor: (index: number) => Date,
): Promise<SeededCustomer[]> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const seeded: SeededCustomer[] = [];
  const seenEmails = new Set<string>();

  for (let i = 0; i < VOLUME.customers; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    // faker can repeat names; email carries a unique constraint per org.
    let email = `${firstName}.${lastName}${i}`
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, '');
    email = `${email}@example.com`;
    if (seenEmails.has(email)) continue;
    seenEmails.add(email);

    const createdAt = createdAtFor(i);

    const [row] = await db
      .insert(customers)
      .values({
        organizationId: orgId,
        email,
        passwordHash,
        firstName,
        lastName,
        status: i % 29 === 0 ? 'disabled' : 'active',
        emailVerified: i % 7 !== 0,
        marketingOptIn: i % 3 === 0,
        createdAt,
        updatedAt: createdAt,
      })
      .returning();

    seeded.push({
      id: row.id,
      email,
      name: `${firstName} ${lastName}`,
    });
  }

  console.log(`  ✓ ${seeded.length} customers (password: ${DEMO_PASSWORD})`);
  return seeded;
}
