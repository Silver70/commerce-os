import { Inject, Injectable } from '@nestjs/common';
import {
  eq,
  and,
  or,
  asc,
  count,
  isNull,
  sql,
  SQL,
  ilike,
  inArray,
} from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../../../shared/database/database.module';
import type { DrizzleClient } from '../../../shared/database/database.module';
import {
  products,
  productVariants,
  productOptions,
  productOptionValues,
  variantOptionValues,
  productCategories,
  productMedia,
} from '../../../shared/database/schema';
import type {
  Product,
  NewProduct,
  ProductVariant,
  NewProductVariant,
  ProductOption,
  NewProductOption,
  ProductOptionValue,
  NewProductOptionValue,
} from '../../../shared/database/schema';
import {
  encodeCursor,
  decodeCursor,
  offsetFor,
  DEFAULT_PAGE_SIZE,
} from '../../../shared/utils/pagination.util';
import { likePattern } from '../../../shared/utils/search.util';
import type { ProductFilterDto } from '../dto/product-filter.dto';

export interface ProductDetail extends Product {
  variants: (ProductVariant & { optionValues: ProductOptionValue[] })[];
  options: (ProductOption & { values: ProductOptionValue[] })[];
  media: (typeof productMedia.$inferSelect)[];
  categoryIds: string[];
}

export interface PaginatedProducts {
  items: ProductDetail[];
  /** Set in cursor mode (storefront GraphQL); null in page mode. */
  nextCursor: string | null;
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Keyset cursor. Carries only the row id — the timestamp half of the sort key
 * is read back out of the database rather than round-tripped through JS.
 * Postgres timestamps hold microseconds and a JS Date only holds milliseconds,
 * so encoding the timestamp here would truncate it and the cursor row would
 * compare as "after itself" and be served twice.
 */
interface ProductCursor {
  id: string;
}

export function encodeProductCursor(p: { id: string }): string {
  return encodeCursor({ id: p.id });
}

function paginatedProducts(
  items: ProductDetail[],
  totalCount: number,
  page: number,
  limit: number,
  nextCursor: string | null,
): PaginatedProducts {
  return {
    items,
    nextCursor,
    totalCount,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(totalCount / limit)),
  };
}

@Injectable()
export class ProductRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  async findBySlug(
    slug: string,
    orgId: string,
    storeId: string,
  ): Promise<Product | null> {
    const [row] = await this.db
      .select()
      .from(products)
      .where(
        and(
          eq(products.organizationId, orgId),
          eq(products.storeId, storeId),
          eq(products.slug, slug),
          isNull(products.deletedAt),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async findById(
    id: string,
    orgId: string,
    storeId: string,
  ): Promise<Product | null> {
    const [row] = await this.db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, id),
          eq(products.organizationId, orgId),
          eq(products.storeId, storeId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async slugExists(
    slug: string,
    orgId: string,
    storeId: string,
  ): Promise<boolean> {
    const [row] = await this.db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.organizationId, orgId),
          eq(products.storeId, storeId),
          eq(products.slug, slug),
          isNull(products.deletedAt),
        ),
      )
      .limit(1);
    return !!row;
  }

  async findWithFilters(
    filter: ProductFilterDto,
    orgId: string,
    storeId: string,
  ): Promise<PaginatedProducts> {
    const limit = filter.limit ?? DEFAULT_PAGE_SIZE;
    const page = filter.page ?? 1;
    // Admin sends `page` (numbered pages); storefront GraphQL sends `cursor`.
    const pageMode = filter.page !== undefined;
    const conditions: SQL[] = [
      eq(products.organizationId, orgId),
      eq(products.storeId, storeId),
      isNull(products.deletedAt),
    ];

    if (filter.status) {
      conditions.push(eq(products.status, filter.status));
    }
    if (filter.vendor) {
      conditions.push(eq(products.vendor, filter.vendor));
    }
    if (filter.search) {
      const pattern = likePattern(filter.search);
      // Merchants search the catalog by SKU as often as by name, and SKUs live
      // on variants — so match either.
      const skuMatches = this.db
        .select({ productId: productVariants.productId })
        .from(productVariants)
        .where(
          and(
            eq(productVariants.organizationId, orgId),
            eq(productVariants.storeId, storeId),
            ilike(productVariants.sku, pattern),
          ),
        );
      const match = or(
        ilike(products.name, pattern),
        inArray(products.id, skuMatches),
      );
      if (match) conditions.push(match);
    }
    if (filter.categoryId) {
      const productIdsInCategory = await this.db
        .select({ productId: productCategories.productId })
        .from(productCategories)
        .where(eq(productCategories.categoryId, filter.categoryId));
      const ids = productIdsInCategory.map((r) => r.productId);
      if (ids.length === 0) {
        return paginatedProducts([], 0, page, limit, null);
      }
      conditions.push(inArray(products.id, ids));
    }

    // Cursor mode only. Row-value comparison against the full ORDER BY tuple:
    // the subquery re-reads the cursor row's exact created_at inside Postgres,
    // so no precision is lost and a row is never returned twice.
    if (!pageMode && filter.cursor) {
      const c = decodeCursor<ProductCursor>(filter.cursor);
      conditions.push(
        sql`(${products.createdAt}, ${products.id}) > (select p2.created_at, p2.id from products p2 where p2.id = ${c.id})`,
      );
    }

    const where = and(...conditions);

    // Count runs concurrently with the page query, so it costs no extra
    // round trip to the database.
    const [rows, [{ value: totalCount }]] = await Promise.all([
      this.db
        .select()
        .from(products)
        .where(where)
        .orderBy(asc(products.createdAt), asc(products.id))
        .limit(pageMode ? limit : limit + 1)
        .offset(pageMode ? offsetFor(page, limit) : 0),
      this.db.select({ value: count() }).from(products).where(where),
    ]);

    const hasNext = !pageMode && rows.length > limit;
    const pageRows = hasNext ? rows.slice(0, limit) : rows;
    const last = pageRows[pageRows.length - 1];
    const nextCursor = hasNext && last ? encodeProductCursor(last) : null;

    const items = await this.findDetailBatch(
      pageRows.map((r) => r.id),
      orgId,
      storeId,
      pageRows,
    );

    return paginatedProducts(items, totalCount, page, limit, nextCursor);
  }

  private async findDetailBatch(
    ids: string[],
    orgId: string,
    storeId: string,
    baseRows: Product[],
  ): Promise<ProductDetail[]> {
    if (ids.length === 0) return [];

    // Stage 1: all first-level relations in parallel
    const [variants, options, media, categoryRows] = await Promise.all([
      this.db
        .select()
        .from(productVariants)
        .where(
          and(
            inArray(productVariants.productId, ids),
            eq(productVariants.organizationId, orgId),
            eq(productVariants.storeId, storeId),
          ),
        ),
      this.db
        .select()
        .from(productOptions)
        .where(
          and(
            inArray(productOptions.productId, ids),
            eq(productOptions.organizationId, orgId),
            eq(productOptions.storeId, storeId),
          ),
        ),
      this.db
        .select()
        .from(productMedia)
        .where(
          and(
            inArray(productMedia.productId, ids),
            eq(productMedia.organizationId, orgId),
            eq(productMedia.storeId, storeId),
          ),
        )
        .orderBy(productMedia.position),
      this.db
        .select({
          productId: productCategories.productId,
          categoryId: productCategories.categoryId,
        })
        .from(productCategories)
        .where(inArray(productCategories.productId, ids)),
    ]);

    // Stage 2: junction tables depend on stage-1 IDs
    const optionIds = options.map((o) => o.id);
    const variantIds = variants.map((v) => v.id);

    const [optionValues, variantOptVals] = await Promise.all([
      optionIds.length > 0
        ? this.db
            .select()
            .from(productOptionValues)
            .where(inArray(productOptionValues.optionId, optionIds))
        : Promise.resolve([] as (typeof productOptionValues.$inferSelect)[]),
      variantIds.length > 0
        ? this.db
            .select()
            .from(variantOptionValues)
            .where(inArray(variantOptionValues.variantId, variantIds))
        : Promise.resolve([] as (typeof variantOptionValues.$inferSelect)[]),
    ]);

    const optValById = new Map(optionValues.map((v) => [v.id, v]));

    return baseRows.map((product) => {
      const pVariants = variants.filter((v) => v.productId === product.id);
      const pOptions = options.filter((o) => o.productId === product.id);

      const variantsWithValues = pVariants.map((v) => ({
        ...v,
        optionValues: variantOptVals
          .filter((vov) => vov.variantId === v.id)
          .map((vov) => optValById.get(vov.optionValueId))
          .filter((ov): ov is ProductOptionValue => ov !== undefined),
      }));

      const optionsWithValues = pOptions.map((o) => ({
        ...o,
        values: optionValues.filter((v) => v.optionId === o.id),
      }));

      return {
        ...product,
        variants: variantsWithValues,
        options: optionsWithValues,
        media: media.filter((m) => m.productId === product.id),
        categoryIds: categoryRows
          .filter((r) => r.productId === product.id)
          .map((r) => r.categoryId),
      };
    });
  }

  async findDetail(
    id: string,
    orgId: string,
    storeId: string,
  ): Promise<ProductDetail | null> {
    const [product] = await this.db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, id),
          eq(products.organizationId, orgId),
          eq(products.storeId, storeId),
        ),
      )
      .limit(1);

    if (!product || product.deletedAt) return null;

    const [variants, options, media, categoryRows] = await Promise.all([
      this.db
        .select()
        .from(productVariants)
        .where(
          and(
            eq(productVariants.productId, id),
            eq(productVariants.organizationId, orgId),
            eq(productVariants.storeId, storeId),
          ),
        ),
      this.db
        .select()
        .from(productOptions)
        .where(
          and(
            eq(productOptions.productId, id),
            eq(productOptions.organizationId, orgId),
            eq(productOptions.storeId, storeId),
          ),
        ),
      this.db
        .select()
        .from(productMedia)
        .where(
          and(
            eq(productMedia.productId, id),
            eq(productMedia.organizationId, orgId),
            eq(productMedia.storeId, storeId),
          ),
        )
        .orderBy(productMedia.position),
      this.db
        .select({ categoryId: productCategories.categoryId })
        .from(productCategories)
        .where(eq(productCategories.productId, id)),
    ]);

    const optionIds = options.map((o) => o.id);
    const optionValues =
      optionIds.length > 0
        ? await this.db
            .select()
            .from(productOptionValues)
            .where(inArray(productOptionValues.optionId, optionIds))
        : [];

    const variantIds = variants.map((v) => v.id);
    const variantOptVals =
      variantIds.length > 0
        ? await this.db
            .select()
            .from(variantOptionValues)
            .where(inArray(variantOptionValues.variantId, variantIds))
        : [];

    const optValById = new Map(optionValues.map((v) => [v.id, v]));
    const variantsWithValues = variants.map((v) => ({
      ...v,
      optionValues: variantOptVals
        .filter((vov) => vov.variantId === v.id)
        .map((vov) => optValById.get(vov.optionValueId))
        .filter((ov): ov is ProductOptionValue => ov !== undefined),
    }));

    const optionsWithValues = options.map((o) => ({
      ...o,
      values: optionValues.filter((v) => v.optionId === o.id),
    }));

    return {
      ...product,
      variants: variantsWithValues,
      options: optionsWithValues,
      media,
      categoryIds: categoryRows.map((r) => r.categoryId),
    };
  }

  async create(data: NewProduct): Promise<Product> {
    const [row] = await this.db.insert(products).values(data).returning();
    return row;
  }

  async update(
    id: string,
    orgId: string,
    storeId: string,
    data: Partial<NewProduct>,
  ): Promise<Product | null> {
    const [row] = await this.db
      .update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(products.id, id),
          eq(products.organizationId, orgId),
          eq(products.storeId, storeId),
        ),
      )
      .returning();
    return row ?? null;
  }

  async softDelete(id: string, orgId: string, storeId: string): Promise<void> {
    await this.db
      .update(products)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(products.id, id),
          eq(products.organizationId, orgId),
          eq(products.storeId, storeId),
        ),
      );
  }

  async createVariant(data: NewProductVariant): Promise<ProductVariant> {
    const [row] = await this.db
      .insert(productVariants)
      .values(data)
      .returning();
    return row;
  }

  async createOption(data: NewProductOption): Promise<ProductOption> {
    const [row] = await this.db.insert(productOptions).values(data).returning();
    return row;
  }

  async createOptionValue(
    data: NewProductOptionValue,
  ): Promise<ProductOptionValue> {
    const [row] = await this.db
      .insert(productOptionValues)
      .values(data)
      .returning();
    return row;
  }

  async linkVariantOptionValue(
    variantId: string,
    optionValueId: string,
  ): Promise<void> {
    await this.db
      .insert(variantOptionValues)
      .values({ variantId, optionValueId })
      .onConflictDoNothing();
  }

  async setProductCategories(
    productId: string,
    categoryIds: string[],
  ): Promise<void> {
    await this.db
      .delete(productCategories)
      .where(eq(productCategories.productId, productId));
    if (categoryIds.length > 0) {
      await this.db
        .insert(productCategories)
        .values(categoryIds.map((cid) => ({ productId, categoryId: cid })));
    }
  }

  async updateVariant(
    variantId: string,
    orgId: string,
    storeId: string,
    data: Partial<NewProductVariant>,
  ): Promise<ProductVariant | null> {
    const [row] = await this.db
      .update(productVariants)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(productVariants.id, variantId),
          eq(productVariants.organizationId, orgId),
          eq(productVariants.storeId, storeId),
        ),
      )
      .returning();
    return row ?? null;
  }

  async deleteVariant(
    variantId: string,
    orgId: string,
    storeId: string,
  ): Promise<void> {
    await this.db
      .delete(productVariants)
      .where(
        and(
          eq(productVariants.id, variantId),
          eq(productVariants.organizationId, orgId),
          eq(productVariants.storeId, storeId),
        ),
      );
  }

  async addMedia(data: {
    organizationId: string;
    storeId: string;
    productId: string;
    url: string;
    altText?: string;
    mediaType?: string;
    position?: number;
    isPrimary?: boolean;
    variantId?: string;
  }): Promise<typeof productMedia.$inferSelect> {
    const [row] = await this.db
      .insert(productMedia)
      .values({
        organizationId: data.organizationId,
        storeId: data.storeId,
        productId: data.productId,
        url: data.url,
        altText: data.altText,
        mediaType: data.mediaType ?? 'image',
        position: data.position ?? 0,
        isPrimary: data.isPrimary ?? false,
        variantId: data.variantId,
      })
      .returning();
    return row;
  }

  async deleteMedia(
    mediaId: string,
    orgId: string,
    storeId: string,
  ): Promise<void> {
    await this.db
      .delete(productMedia)
      .where(
        and(
          eq(productMedia.id, mediaId),
          eq(productMedia.organizationId, orgId),
          eq(productMedia.storeId, storeId),
        ),
      );
  }

  async reorderMedia(
    productId: string,
    orgId: string,
    storeId: string,
    orderedIds: string[],
  ): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      await this.db
        .update(productMedia)
        .set({ position: i })
        .where(
          and(
            eq(productMedia.id, orderedIds[i]),
            eq(productMedia.productId, productId),
            eq(productMedia.organizationId, orgId),
            eq(productMedia.storeId, storeId),
          ),
        );
    }
  }

  async skuExists(
    sku: string,
    orgId: string,
    storeId: string,
  ): Promise<boolean> {
    const [row] = await this.db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(
        and(
          eq(productVariants.organizationId, orgId),
          eq(productVariants.storeId, storeId),
          eq(productVariants.sku, sku),
        ),
      )
      .limit(1);
    return !!row;
  }
}
