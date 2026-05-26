import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as https from 'https';

// Node.js undici (native fetch) has a TCP connectivity issue on some networks.
// This shim delegates to the https module (same stack as curl) with IPv4 forced.
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

  return new Promise((resolve2, reject) => {
    const options: https.RequestOptions = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: (init?.method ?? 'GET').toUpperCase(),
      headers: init?.headers as Record<string, string> | undefined,
      family: 4,
    };

    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve2(
          new globalThis.Response(buf, {
            status: res.statusCode,
            headers: res.headers as Record<string, string>,
          }),
        );
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

neonConfig.fetchFunction = httpsFetch;

dotenv.config({ path: resolve(process.cwd(), '.env') });

async function main() {
  const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.error('No database URL configured');
    process.exit(1);
  }

  const sql = neon(url);
  const db = drizzle(sql);

  try {
    console.log('Running migrations...');
    await migrate(db, {
      migrationsFolder: resolve(
        process.cwd(),
        'src/shared/database/migrations',
      ),
    });
    console.log('Migrations applied successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
