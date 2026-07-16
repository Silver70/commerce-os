/**
 * Builds an ILIKE pattern for a free-text search term.
 *
 * `%` and `_` are LIKE wildcards, so an unescaped term containing either would
 * match far more rows than the user typed — a lone `%` matches everything.
 */
export function likePattern(term: string): string {
  const escaped = term.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  return `%${escaped}%`;
}
