import { faker } from '@faker-js/faker';
import {
  categories,
  products,
  productCategories,
  productVariants,
  inventoryItems,
} from '../../schema';
import { CATEGORIES, VOLUME, type SeedDb } from './config';

export type SeededVariant = {
  id: string;
  productId: string;
  productName: string;
  variantName: string;
  sku: string;
  price: number;
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Categories, products, variants and inventory for the demo store.
 *
 * Product names come from faker and can repeat, so slugs and SKUs are
 * disambiguated with the product index — both carry uniqueness constraints.
 */
export async function seedCatalog(
  db: SeedDb,
  orgId: string,
  storeId: string,
): Promise<{ variants: SeededVariant[]; categoryIds: string[] }> {
  const categoryIds: string[] = [];

  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i];
    const [row] = await db
      .insert(categories)
      .values({
        organizationId: orgId,
        storeId,
        name: c.name,
        slug: slugify(c.name),
        description: c.description,
        position: i,
      })
      .returning();
    categoryIds.push(row.id);
  }
  console.log(`  ✓ ${categoryIds.length} categories`);

  const variants: SeededVariant[] = [];

  for (let i = 0; i < VOLUME.products; i++) {
    const name = faker.commerce.productName();
    const slug = `${slugify(name)}-${i + 1}`;
    // Integer cents, never floats — see the money rule in CLAUDE.md.
    const basePrice = faker.number.int({ min: 1999, max: 249999 });

    const [product] = await db
      .insert(products)
      .values({
        organizationId: orgId,
        storeId,
        name,
        slug,
        description: faker.commerce.productDescription(),
        // A few drafts and archived rows so status filters have something to do.
        status: i % 17 === 0 ? 'draft' : i % 23 === 0 ? 'archived' : 'active',
        vendor: faker.helpers.arrayElement([
          'ASUS',
          'ROG',
          'TUF Gaming',
          'ProArt',
          'Zenbook',
        ]),
      })
      .returning();

    await db.insert(productCategories).values({
      productId: product.id,
      categoryId: categoryIds[i % categoryIds.length],
    });

    const variantNames = faker.helpers.arrayElement([
      ['Standard'],
      ['Base', 'Pro'],
      ['128GB', '256GB', '512GB'],
      ['Black', 'White'],
    ]);

    for (let j = 0; j < variantNames.length; j++) {
      const price = basePrice + j * faker.number.int({ min: 500, max: 8000 });
      const sku = `${slug}-${slugify(variantNames[j])}`.toUpperCase();

      const [variant] = await db
        .insert(productVariants)
        .values({
          organizationId: orgId,
          storeId,
          productId: product.id,
          sku,
          name: variantNames[j],
          price,
          isActive: true,
          position: j,
        })
        .returning();

      // Some variants land at or under the threshold so the low-stock widget
      // on the dashboard has real rows to report.
      const quantity = faker.helpers.weightedArrayElement([
        { value: faker.number.int({ min: 20, max: 400 }), weight: 82 },
        { value: faker.number.int({ min: 0, max: 5 }), weight: 18 },
      ]);

      await db.insert(inventoryItems).values({
        organizationId: orgId,
        storeId,
        variantId: variant.id,
        quantity,
        reserved: 0,
        allowBackorder: false,
        lowStockThreshold: 5,
      });

      variants.push({
        id: variant.id,
        productId: product.id,
        productName: name,
        variantName: variantNames[j],
        sku,
        price,
      });
    }
  }

  console.log(
    `  ✓ ${VOLUME.products} products / ${variants.length} variants (+ inventory)`,
  );
  return { variants, categoryIds };
}
