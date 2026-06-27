/**
 * ◄ TEMPLATE KNOB — homepage merchandising.
 *
 * Each section renders a heading + a product grid populated from the category
 * with the given slug. Slugs are resolved to category IDs at request time, so
 * no category UUIDs are ever hardcoded here.
 */

export interface HomeSection {
  /** Heading shown above the grid. */
  title: string;
  /** Optional supporting copy under the heading. */
  subtitle?: string;
  /** Category slug to pull products from. */
  categorySlug: string;
  /** Max number of products to show in the section. */
  limit: number;
}

export const homeSections: HomeSection[] = [
  { title: "New Arrivals", categorySlug: "new", limit: 8 },
  { title: "Apparel", categorySlug: "apparel", limit: 4 },
];
