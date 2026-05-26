import { gt } from 'drizzle-orm';
import { AnyColumn } from 'drizzle-orm';

export function encodeCursor(obj: Record<string, any>): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64');
}

export function decodeCursor<T = Record<string, any>>(cursor: string): T {
  return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8')) as T;
}

export function buildCursorWhere(
  cursor: string | undefined,
  column: AnyColumn,
) {
  if (!cursor) return undefined;
  const decoded = decodeCursor(cursor);
  return gt(column, decoded.value);
}
