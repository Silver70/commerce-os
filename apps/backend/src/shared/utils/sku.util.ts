/** Acronym for a product name, e.g. "Wave Board Pro" -> "WBP". */
export function generateSku(name: string): string {
  const words = name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 'SKU';
  if (words.length === 1) return words[0].slice(0, 3);
  return words.map((w) => w[0]).join('');
}

/**
 * Generate a SKU that is guaranteed unique within the store. Used as a fallback
 * when a variant is created without an explicit SKU; the compact, option-aware
 * SKU is normally supplied by the admin UI. Produces e.g. "WBP-01", "WBP-02".
 */
export async function generateUniqueSku(
  name: string,
  existsFn: (sku: string) => Promise<boolean>,
): Promise<string> {
  const base = generateSku(name);
  let counter = 1;
  let sku = `${base}-${String(counter).padStart(2, '0')}`;

  while (await existsFn(sku)) {
    counter++;
    sku = `${base}-${String(counter).padStart(2, '0')}`;
  }

  return sku;
}
