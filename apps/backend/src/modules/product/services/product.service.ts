import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { generateUniqueSlug } from '../../../shared/utils/slug.util';
import {
  ProductCreatedEvent,
  ProductUpdatedEvent,
  ProductDeletedEvent,
} from '../../../shared/events/events';
import { ProductRepository } from '../repositories/product.repository';
import type {
  ProductDetail,
  PaginatedProducts,
} from '../repositories/product.repository';
import type { CreateProductDto } from '../dto/create-product.dto';
import type { UpdateProductDto } from '../dto/update-product.dto';
import type { CreateVariantDto } from '../dto/create-variant.dto';
import type { UpdateVariantDto } from '../dto/update-variant.dto';
import type { ProductFilterDto } from '../dto/product-filter.dto';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import type { Product, ProductVariant } from '../../../shared/database/schema';
import type { productMedia } from '../../../shared/database/schema';

type ProductMedia = typeof productMedia.$inferSelect;

@Injectable()
export class ProductService {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    dto: CreateProductDto,
    tenant: TenantContext,
  ): Promise<ProductDetail> {
    const { organizationId } = tenant;

    const slug = await generateUniqueSlug(dto.name, (s) =>
      this.productRepo.slugExists(s, organizationId),
    );

    const product = await this.productRepo.create({
      organizationId,
      name: dto.name,
      slug,
      description: dto.description,
      status: dto.status ?? 'draft',
      vendor: dto.vendor,
      tags: dto.tags,
      seoTitle: dto.seoTitle,
      seoDescription: dto.seoDescription,
    });

    if (dto.options && dto.options.length > 0) {
      for (let i = 0; i < dto.options.length; i++) {
        const optDto = dto.options[i];
        const option = await this.productRepo.createOption({
          organizationId,
          productId: product.id,
          name: optDto.name,
          position: optDto.position ?? i,
        });

        if (optDto.values) {
          for (let j = 0; j < optDto.values.length; j++) {
            await this.productRepo.createOptionValue({
              organizationId,
              optionId: option.id,
              value: optDto.values[j].value,
              position: optDto.values[j].position ?? j,
            });
          }
        }
      }
    }

    if (dto.variants && dto.variants.length > 0) {
      for (let i = 0; i < dto.variants.length; i++) {
        await this.createVariantInternal(
          product.id,
          organizationId,
          dto.variants[i],
          i,
        );
      }
    }

    if (dto.categoryIds && dto.categoryIds.length > 0) {
      await this.productRepo.setProductCategories(product.id, dto.categoryIds);
    }

    this.eventEmitter.emit(
      'product.created',
      new ProductCreatedEvent(product.id, organizationId),
    );

    const detail = await this.productRepo.findDetail(
      product.id,
      organizationId,
    );
    if (!detail)
      throw new NotFoundException('Product not found after creation');
    return detail;
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    tenant: TenantContext,
  ): Promise<ProductDetail> {
    const { organizationId } = tenant;
    const existing = await this.productRepo.findById(id, organizationId);
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Product not found');
    }

    const patch: Record<string, unknown> = {};

    if (dto.name && dto.name !== existing.name) {
      patch.name = dto.name;
      patch.slug = await generateUniqueSlug(dto.name, (s) =>
        this.productRepo.slugExists(s, organizationId),
      );
    }
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.vendor !== undefined) patch.vendor = dto.vendor;
    if (dto.tags !== undefined) patch.tags = dto.tags;
    if (dto.seoTitle !== undefined) patch.seoTitle = dto.seoTitle;
    if (dto.seoDescription !== undefined)
      patch.seoDescription = dto.seoDescription;

    if (Object.keys(patch).length > 0) {
      await this.productRepo.update(id, organizationId, patch);
    }

    if (dto.categoryIds !== undefined) {
      await this.productRepo.setProductCategories(id, dto.categoryIds);
    }

    this.eventEmitter.emit(
      'product.updated',
      new ProductUpdatedEvent(id, organizationId),
    );

    const detail = await this.productRepo.findDetail(id, organizationId);
    if (!detail) throw new NotFoundException('Product not found after update');
    return detail;
  }

  async softDelete(id: string, tenant: TenantContext): Promise<void> {
    const { organizationId } = tenant;
    const existing = await this.productRepo.findById(id, organizationId);
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Product not found');
    }
    await this.productRepo.softDelete(id, organizationId);
    this.eventEmitter.emit(
      'product.deleted',
      new ProductDeletedEvent(id, organizationId),
    );
  }

  async list(
    filter: ProductFilterDto,
    tenant: TenantContext,
  ): Promise<PaginatedProducts> {
    return this.productRepo.findWithFilters(filter, tenant.organizationId);
  }

  async getDetail(id: string, tenant: TenantContext): Promise<ProductDetail> {
    const detail = await this.productRepo.findDetail(id, tenant.organizationId);
    if (!detail) throw new NotFoundException('Product not found');
    return detail;
  }

  async getBySlug(slug: string, tenant: TenantContext): Promise<ProductDetail> {
    const product = await this.productRepo.findBySlug(
      slug,
      tenant.organizationId,
    );
    if (!product) throw new NotFoundException('Product not found');
    const detail = await this.productRepo.findDetail(
      product.id,
      tenant.organizationId,
    );
    if (!detail) throw new NotFoundException('Product not found');
    return detail;
  }

  async createVariant(
    productId: string,
    dto: CreateVariantDto,
    tenant: TenantContext,
  ): Promise<ProductVariant> {
    const { organizationId } = tenant;
    const product = await this.productRepo.findById(productId, organizationId);
    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found');
    }
    return this.createVariantInternal(product.id, organizationId, dto);
  }

  async updateVariant(
    productId: string,
    variantId: string,
    dto: UpdateVariantDto,
    tenant: TenantContext,
  ): Promise<ProductVariant> {
    const { organizationId } = tenant;
    const product = await this.productRepo.findById(productId, organizationId);
    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found');
    }

    const updated = await this.productRepo.updateVariant(
      variantId,
      organizationId,
      dto,
    );
    if (!updated) throw new NotFoundException('Variant not found');

    if (dto.optionValueIds !== undefined) {
      for (const ovId of dto.optionValueIds) {
        await this.productRepo.linkVariantOptionValue(variantId, ovId);
      }
    }

    return updated;
  }

  async deleteVariant(
    productId: string,
    variantId: string,
    tenant: TenantContext,
  ): Promise<void> {
    const { organizationId } = tenant;
    const product = await this.productRepo.findById(productId, organizationId);
    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found');
    }

    const detail = await this.productRepo.findDetail(productId, organizationId);
    if (detail && detail.variants.length <= 1) {
      throw new BadRequestException('Product must have at least one variant');
    }

    await this.productRepo.deleteVariant(variantId, organizationId);
  }

  async addMedia(
    productId: string,
    url: string,
    tenant: TenantContext,
    options?: {
      altText?: string;
      mediaType?: string;
      position?: number;
      variantId?: string;
    },
  ): Promise<ProductMedia> {
    const { organizationId } = tenant;
    const product = await this.productRepo.findById(productId, organizationId);
    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found');
    }
    return this.productRepo.addMedia({
      organizationId,
      productId,
      url,
      ...options,
    });
  }

  async deleteMedia(
    productId: string,
    mediaId: string,
    tenant: TenantContext,
  ): Promise<void> {
    const { organizationId } = tenant;
    const product = await this.productRepo.findById(productId, organizationId);
    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found');
    }
    await this.productRepo.deleteMedia(mediaId, organizationId);
  }

  async reorderMedia(
    productId: string,
    orderedIds: string[],
    tenant: TenantContext,
  ): Promise<void> {
    const { organizationId } = tenant;
    const product = await this.productRepo.findById(productId, organizationId);
    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found');
    }
    await this.productRepo.reorderMedia(productId, organizationId, orderedIds);
  }

  async findMany(
    filter: ProductFilterDto,
    tenant: TenantContext,
  ): Promise<Product[]> {
    const result = await this.productRepo.findWithFilters(
      filter,
      tenant.organizationId,
    );
    return result.items;
  }

  private async createVariantInternal(
    productId: string,
    organizationId: string,
    dto: {
      sku: string;
      name?: string;
      price: number;
      compareAtPrice?: number;
      costPrice?: number;
      weight?: number;
      weightUnit?: string;
      requiresShipping?: boolean;
      position?: number;
      optionValueIds?: string[];
    },
    defaultPosition = 0,
  ): Promise<ProductVariant> {
    const skuTaken = await this.productRepo.skuExists(dto.sku, organizationId);
    if (skuTaken) {
      throw new ConflictException(`SKU "${dto.sku}" already exists`);
    }

    const variant = await this.productRepo.createVariant({
      organizationId,
      productId,
      sku: dto.sku,
      name: dto.name,
      price: dto.price,
      compareAtPrice: dto.compareAtPrice,
      costPrice: dto.costPrice,
      weight: dto.weight,
      weightUnit: dto.weightUnit,
      requiresShipping: dto.requiresShipping ?? true,
      position: dto.position ?? defaultPosition,
    });

    if (dto.optionValueIds && dto.optionValueIds.length > 0) {
      for (const ovId of dto.optionValueIds) {
        await this.productRepo.linkVariantOptionValue(variant.id, ovId);
      }
    }

    return variant;
  }
}
