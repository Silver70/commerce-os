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

// ─── Offset pagination (admin REST) ──────────────────────────────────────────
//
// The admin dashboard shows numbered pages, which a cursor cannot serve — a
// cursor only knows "what follows this row", so it can never jump to page 7.
// Storefront GraphQL keeps using cursors (Relay connections require them);
// these helpers are for the admin side only.

export const DEFAULT_PAGE_SIZE = 25;

/** Uniform envelope for every paginated admin list response. */
export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export function offsetFor(page: number, limit: number): number {
  return (Math.max(1, page) - 1) * limit;
}

export function paginated<T>(
  items: T[],
  totalCount: number,
  page: number,
  limit: number,
): Paginated<T> {
  return {
    items,
    page,
    limit,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / limit)),
  };
}
