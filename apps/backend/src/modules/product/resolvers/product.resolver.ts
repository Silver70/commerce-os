import { Resolver, Query, Args, ID, Context, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { StorefrontAuthGuard } from '../../auth/guards/storefront-auth.guard';
import { ProductService } from '../services/product.service';
import { CategoryService } from '../services/category.service';
import {
  ProductType,
  ProductConnection,
  ProductEdge,
  PageInfo,
  CategoryType,
} from '../models/product.model';
import type { ProductDetail } from '../repositories/product.repository';
import type { CategoryTreeNode } from '../repositories/category.repository';
import { encodeCursor } from '../../../shared/utils/pagination.util';
import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import type { Request } from 'express';

@InputType()
export class ProductFilterInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsEnum(['draft', 'active', 'archived'])
  status?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  vendor?: string;
}

interface GqlContext {
  req: Request & { tenantContext?: TenantContext };
}

@Resolver(() => ProductType)
@UseGuards(StorefrontAuthGuard)
export class ProductResolver {
  constructor(
    private readonly productService: ProductService,
    private readonly categoryService: CategoryService,
  ) {}

  @Query(() => ProductConnection, { description: 'Paginated product listing' })
  async products(
    @Context() ctx: GqlContext,
    @Args('first', { type: () => Int, nullable: true }) first?: number,
    @Args('after', { nullable: true }) after?: string,
    @Args('filter', { nullable: true }) filter?: ProductFilterInput,
  ): Promise<ProductConnection> {
    const tenant = ctx.req.tenantContext ?? { organizationId: '' };
    const limit = Math.min(first ?? 20, 100);
    const result = await this.productService.list(
      {
        ...filter,
        status: filter?.status as 'draft' | 'active' | 'archived' | undefined,
        cursor: after,
        limit,
      },
      tenant,
    );

    const edges: ProductEdge[] = result.items.map((p) => ({
      node: toProductType(p),
      cursor: encodeCursor({ id: p.id }),
    }));

    const pageInfo: PageInfo = {
      hasNextPage: result.nextCursor !== null,
      endCursor: result.nextCursor ?? undefined,
    };

    return { edges, pageInfo, totalCount: result.totalCount };
  }

  @Query(() => ProductType, { nullable: true })
  async product(
    @Context() ctx: GqlContext,
    @Args('id', { type: () => ID, nullable: true }) id?: string,
    @Args('slug', { nullable: true }) slug?: string,
  ): Promise<ProductType | null> {
    const tenant = ctx.req.tenantContext ?? { organizationId: '' };
    if (id) {
      return toProductType(await this.productService.getDetail(id, tenant));
    }
    if (slug) {
      return toProductType(await this.productService.getBySlug(slug, tenant));
    }
    return null;
  }

  @Query(() => [CategoryType])
  async categories(@Context() ctx: GqlContext): Promise<CategoryType[]> {
    const tenant = ctx.req.tenantContext ?? { organizationId: '' };
    const tree = await this.categoryService.getTree(tenant);
    return tree.map(toCategoryType);
  }

  @Query(() => CategoryType, { nullable: true })
  async category(
    @Context() ctx: GqlContext,
    @Args('slug', { nullable: true }) slug?: string,
    @Args('id', { type: () => ID, nullable: true }) id?: string,
  ): Promise<CategoryType | null> {
    const tenant = ctx.req.tenantContext ?? { organizationId: '' };
    if (slug) {
      const cat = await this.categoryService.getBySlug(slug, tenant);
      return toCategoryType(cat);
    }
    if (id) {
      const cat = await this.categoryService.getById(id, tenant);
      return toCategoryType(cat);
    }
    return null;
  }
}

function toProductType(detail: ProductDetail): ProductType {
  const prices = detail.variants.filter((v) => v.isActive).map((v) => v.price);

  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

  return {
    id: detail.id,
    name: detail.name,
    slug: detail.slug,
    description: detail.description ?? undefined,
    status: detail.status,
    vendor: detail.vendor ?? undefined,
    tags: detail.tags ?? undefined,
    seoTitle: detail.seoTitle ?? undefined,
    seoDescription: detail.seoDescription ?? undefined,
    variants: detail.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      name: v.name ?? undefined,
      price: v.price,
      compareAtPrice: v.compareAtPrice ?? undefined,
      weight: v.weight ?? undefined,
      weightUnit: v.weightUnit ?? undefined,
      requiresShipping: v.requiresShipping,
      isActive: v.isActive,
      position: v.position,
      optionValues: v.optionValues.map((ov) => ({
        id: ov.id,
        value: ov.value,
        position: ov.position,
      })),
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    })),
    options: detail.options.map((o) => ({
      id: o.id,
      name: o.name,
      position: o.position,
      values: o.values.map((v) => ({
        id: v.id,
        value: v.value,
        position: v.position,
      })),
    })),
    media: detail.media.map((m) => ({
      id: m.id,
      url: m.url,
      altText: m.altText ?? undefined,
      mediaType: m.mediaType,
      position: m.position,
      isPrimary: m.isPrimary,
    })),
    categoryIds: detail.categoryIds,
    minPrice,
    maxPrice,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
  };
}

function toCategoryType(
  cat:
    | CategoryTreeNode
    | (Omit<CategoryTreeNode, 'children'> & { children?: CategoryTreeNode[] }),
): CategoryType {
  return {
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description ?? undefined,
    parentId: cat.parentId ?? undefined,
    position: cat.position,
    children: (cat.children ?? []).map(toCategoryType),
    createdAt: cat.createdAt,
    updatedAt: cat.updatedAt,
  };
}
