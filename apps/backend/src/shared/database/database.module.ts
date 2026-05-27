import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as https from 'https';
import * as schema from './schema';

export const DRIZZLE_CLIENT = 'DRIZZLE_CLIENT';

export type DrizzleClient = ReturnType<typeof drizzle>;

// Node.js undici (native fetch) times out on some networks due to IPv6 fallback.
// This shim forces IPv4 and uses the https module which connects reliably.
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

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: (init?.method ?? 'GET').toUpperCase(),
        headers: init?.headers as Record<string, string> | undefined,
        family: 4,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          resolve(
            new globalThis.Response(Buffer.concat(chunks), {
              status: res.statusCode,
              headers: res.headers as Record<string, string>,
            }),
          );
        });
      },
    );
    req.on('error', reject);
    const body = init?.body as string | undefined;
    if (body) req.write(body);
    req.end();
  });
}

neonConfig.fetchFunction = httpsFetch;

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.getOrThrow<string>('DATABASE_URL');
        const sql = neon(databaseUrl);
        return drizzle(sql, { schema });
      },
    },
  ],
  exports: [DRIZZLE_CLIENT],
})
export class DatabaseModule {}
