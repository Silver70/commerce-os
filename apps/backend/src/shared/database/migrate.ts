import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

async function main() {
  const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.error('No database URL configured');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url, options: '-c timezone=UTC' });
  const db = drizzle(pool);

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
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
