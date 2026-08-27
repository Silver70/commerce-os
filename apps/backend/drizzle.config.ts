import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL!;

export default {
  schema: './src/shared/database/schema/index.ts',
  out: './src/shared/database/migrations',
  dialect: 'postgresql',
  dbCredentials: { url },
} satisfies Config;
