/**
 * Admin bootstrap seed — creates (or updates) a self-hosted admin user and gives
 * them a super_admin membership in an organization. This is how you regain access
 * without WorkOS: run it once, then log in at POST /api/auth/admin/login.
 *
 * Usage:
 *   ADMIN_EMAIL=you@acme.com ADMIN_PASSWORD='secret123' npx tsx src/shared/database/seeds/seed-admin.ts
 *
 * Env:
 *   ADMIN_EMAIL     (required) email for the admin user
 *   ADMIN_PASSWORD  (required) password (min 8 chars)
 *   ADMIN_NAME      (optional) display name
 *   SEED_ORG_ID     (optional) target org UUID; defaults to the first organization
 *
 * Re-running is safe: an existing user's password is reset, and the membership is
 * created only if missing.
 */

import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as https from 'https';
import * as bcrypt from 'bcrypt';
import { and, eq } from 'drizzle-orm';
import { adminUsers, organizations, organizationMembers } from '../schema';

// ─── HTTPS fetch shim — forces IPv4 (mirrors migrate.ts / seed.ts) ───────────

function httpsFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url =
    typeof input === 'string'
      ? new URL(input)
      : input instanceof URL
        ? input
        : new URL(input.url);
  const body = init?.body as string | undefined;

  return new Promise((res, rej) => {
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: (init?.method ?? 'GET').toUpperCase(),
        headers: init?.headers as Record<string, string> | undefined,
        family: 4,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (c: Buffer) => chunks.push(c));
        response.on('end', () =>
          res(
            new globalThis.Response(Buffer.concat(chunks), {
              status: response.statusCode,
              headers: response.headers as Record<string, string>,
            }),
          ),
        );
      },
    );
    req.on('error', rej);
    if (body) req.write(body);
    req.end();
  });
}

neonConfig.fetchFunction = httpsFetch;

async function main() {
  dotenv.config({ path: resolve(process.cwd(), '.env') });

  const dbUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() ?? null;

  if (!email || !password) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD are required');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('ADMIN_PASSWORD must be at least 8 characters');
    process.exit(1);
  }

  const sql = neon(dbUrl);
  const db = drizzle(sql);

  // ── Resolve target org ───────────────────────────────────────────────────────
  const orgId = process.env.SEED_ORG_ID;
  const [org] = orgId
    ? await db.select().from(organizations).where(eq(organizations.id, orgId))
    : await db.select().from(organizations).limit(1);

  if (!org) {
    console.error(
      orgId
        ? `Organization not found: ${orgId}`
        : 'No organizations exist yet — create one via POST /api/auth/admin/register instead',
    );
    process.exit(1);
  }

  // ── Upsert admin user ────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(password, 12);
  const [existing] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email));

  let userId: string;
  if (existing) {
    await db
      .update(adminUsers)
      .set({ passwordHash, name: name ?? existing.name, updatedAt: new Date() })
      .where(eq(adminUsers.id, existing.id));
    userId = existing.id;
    console.log(`✓ Updated existing admin user ${email}`);
  } else {
    const [created] = await db
      .insert(adminUsers)
      .values({ email, passwordHash, name, emailVerified: true })
      .returning();
    userId = created.id;
    console.log(`✓ Created admin user ${email}`);
  }

  // ── Ensure super_admin membership ────────────────────────────────────────────
  const [membership] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, org.id),
        eq(organizationMembers.adminUserId, userId),
      ),
    );

  if (membership) {
    console.log(`✓ Membership already exists (role: ${membership.role})`);
  } else {
    await db.insert(organizationMembers).values({
      organizationId: org.id,
      adminUserId: userId,
      role: 'super_admin',
    });
    console.log(`✓ Added super_admin membership in "${org.name}"`);
  }

  console.log('\n✅ Admin bootstrap complete!');
  console.log(`\nLogin at POST /api/auth/admin/login`);
  console.log(`  email    : ${email}`);
  console.log(`  org      : ${org.name} (${org.id})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
