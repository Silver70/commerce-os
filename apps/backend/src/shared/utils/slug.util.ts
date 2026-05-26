export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export async function generateUniqueSlug(
  name: string,
  existsFn: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = generateSlug(name);
  let slug = base;
  let counter = 2;

  while (await existsFn(slug)) {
    slug = `${base}-${counter}`;
    counter++;
  }

  return slug;
}
