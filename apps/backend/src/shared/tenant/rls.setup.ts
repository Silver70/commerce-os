import { sql } from 'drizzle-orm';
import { DrizzleClient } from '../database/database.module';

export async function setRlsContext(
  db: DrizzleClient,
  orgId: string,
  storeId?: string,
): Promise<void> {
  await db.execute(sql`SET LOCAL app.current_org_id = ${orgId}`);
  if (storeId) {
    await db.execute(sql`SET LOCAL app.current_store_id = ${storeId}`);
  }
}
