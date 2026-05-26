import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export const DRIZZLE_CLIENT = 'DRIZZLE_CLIENT';

export type DrizzleClient = ReturnType<typeof drizzle>;

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
