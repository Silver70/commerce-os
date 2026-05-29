import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import { execSync } from 'node:child_process';

dotenv.config({ path: '.env' });

const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL!;

// This machine has no working IPv6 route, but Neon's hostname resolves to an
// IPv6 address first. drizzle-kit's bundled postgres-js driver connects to that
// IPv6 address and never falls back to IPv4, so `push`/`pull` hang at
// "Pulling schema..." and exit silently. Resolve the host to IPv4 and keep the
// original hostname for TLS SNI. (migrate.ts / seed.ts force IPv4 the same way
// for the neon-http driver.)
function resolveIpv4(host: string): string | undefined {
  try {
    const out = execSync(`getent ahostsv4 ${host}`, { encoding: 'utf8' });
    return out.match(/^(\d+\.\d+\.\d+\.\d+)/m)?.[1];
  } catch {
    return undefined;
  }
}

const u = new URL(url);
const ipv4 = resolveIpv4(u.hostname);

export default {
  schema: './src/shared/database/schema/index.ts',
  out: './src/shared/database/migrations',
  dialect: 'postgresql',
  dbCredentials: ipv4
    ? {
        host: ipv4,
        port: Number(u.port) || 5432,
        user: decodeURIComponent(u.username),
        password: decodeURIComponent(u.password),
        database: u.pathname.replace(/^\//, ''),
        ssl: { servername: u.hostname }, // TLS verification stays on; SNI -> real host
      }
    : { url },
} satisfies Config;
