import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DRIZZLE_CLIENT = 'DRIZZLE_CLIENT';
export const DRIZZLE_POOL = 'DRIZZLE_POOL';

export type DrizzleClient = ReturnType<typeof drizzle>;

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.getOrThrow<string>('DATABASE_URL');
        // Every timestamp column is `timestamp without time zone` defaulting to
        // now(), so the wall-clock value stored depends on the SERVER's
        // timezone — while query bounds are sent as UTC ISO strings
        // (date.toISOString()). Those only line up if the server is on UTC.
        // Neon was; a local Postgres inherits the host's zone, which silently
        // shifted every `now()` and hid recent rows from the dashboard.
        // Pin the session to UTC so any dev machine matches production.
        return new Pool({
          connectionString: databaseUrl,
          options: '-c timezone=UTC',
        });
      },
    },
    {
      provide: DRIZZLE_CLIENT,
      inject: [DRIZZLE_POOL],
      useFactory: (pool: Pool) => drizzle(pool, { schema }),
    },
  ],
  exports: [DRIZZLE_CLIENT, DRIZZLE_POOL],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(DRIZZLE_POOL) private readonly pool: Pool) {}

  // neon-http was stateless; a TCP pool holds open sockets that would keep the
  // process alive on shutdown, so drain it when Nest tears the module down.
  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
