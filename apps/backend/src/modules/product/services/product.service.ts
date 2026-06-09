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
import { InventoryService } from '../../inventory/services/inventory.service';
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
import { requireStoreContext } from '../../../shared/tenant/tenant.util';
import type { Product, ProductVariant } from '../../../shared/database/schema';
import type { productMedia } from '../../../shared/database/schema';

type ProductMedia = typeof productMedia.$inferSelect;

@Injectable()
export class ProductService {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly inventoryService: InventoryService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    dto: CreateProductDto,
    tenant: TenantContext,
  ): Promise<ProductDetail> {
    const { organizationId, storeId } = requireStoreContext(tenant);

    const slug = await generateUniqueSlug(dto.name, (s) =>
      this.productRepo.slugExists(s, organizationId, storeId),
    );

    const product = await this.productRepo.create({
      organizationId,
      storeId,
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
      this.assertOptionsUnique(dto.options);
      for (let i = 0; i < dto.options.length; i++) {
        const optDto = dto.options[i];
        const option = await this.productRepo.createOption({
          organizationId,
          storeId,
          productId: product.id,
          name: optDto.name,
          position: optDto.position ?? i,
        });

        if (optDto.values) {
          for (let j = 0; j < optDto.values.length; j++) {
            await this.productRepo.createOptionValue({
              organizationId,
              storeId,
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
          storeId,
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
      new ProductCreatedEvent(product.id, organizationId, storeId),
    );

    const detail = await this.productRepo.findDetail(
      product.id,
      organizationId,
      storeId,
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
    const { organizationId, storeId } = requireStoreContext(tenant);
    const existing = await this.productRepo.findById(
      id,
      organizationId,
      storeId,
    );
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Product not found');
    }

    const patch: Record<string, unknown> = {};

    if (dto.name && dto.name !== existing.name) {
      patch.name = dto.name;
      patch.slug = await generateUniqueSlug(dto.name, (s) =>
        this.productRepo.slugExists(s, organizationId, storeId),
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
      await this.productRepo.update(id, organizationId, storeId, patch);
    }

    if (dto.categoryIds !== undefined) {
      await this.productRepo.setProductCategories(id, dto.categoryIds);
    }

    this.eventEmitter.emit(
      'product.updated',
      new ProductUpdatedEvent(id, organizationId, storeId),
    );

    const detail = await this.productRepo.findDetail(
      id,
      organizationId,
      storeId,
    );
    if (!detail) throw new NotFoundException('Product not found after update');
    return detail;
  }

  async softDelete(id: string, tenant: TenantContext): Promise<void> {
    const { organizationId, storeId } = requireStoreContext(tenant);
    const existing = await this.productRepo.findById(
      id,
      organizationId,
      storeId,
    );
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Product not found');
    }
    await this.productRepo.softDelete(id, organizationId, storeId);
    this.eventEmitter.emit(
      'product.deleted',
      new ProductDeletedEvent(id, organizationId, storeId),
    );
  }

  async list(
    filter: ProductFilterDto,
    tenant: TenantContext,
  ): Promise<PaginatedProducts> {
    const { organizationId, storeId } = requireStoreContext(tenant);
    return this.productRepo.findWithFilters(filter, organizationId, storeId);
  }

  async getDetail(id: string, tenant: TenantContext): Promise<ProductDetail> {
    const { organizationId, storeId } = requireStoreContext(tenant);
    const detail = await this.productRepo.findDetail(
      id,
      organizationId,
      storeId,
    );
    if (!detail) throw new NotFoundException('Product not found');
    return detail;
  }

  async getBySlug(slug: string, tenant: TenantContext): Promise<ProductDetail> {
    const { organizationId, storeId } = requireStoreContext(tenant);
    const product = await this.productRepo.findBySlug(
      slug,
      organizationId,
      storeId,
    );
    if (!product) throw new NotFoundException('Product not found');
    const detail = await this.productRepo.findDetail(
      product.id,
      organizationId,
      storeId,
    );
    if (!detail) throw new NotFoundException('Product not found');
    return detail;
  }

  async createVariant(
    productId: string,
    dto: CreateVariantDto,
    tenant: TenantContext,
  ): Promise<ProductVariant> {
    const { organizationId, storeId } = requireStoreContext(tenant);
    const product = await this.productRepo.findById(
      productId,
      organizationId,
      storeId,
    );
    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found');
    }
    return this.createVariantInternal(product.id, organizationId, storeId, dto);
  }

  async updateVariant(
    productId: string,
    variantId: string,
    dto: UpdateVariantDto,
    tenant: TenantContext,
  ): Promise<ProductVariant> {
    const { organizationId, storeId } = requireStoreContext(tenant);
    const product = await this.productRepo.findById(
      productId,
      organizationId,
      storeId,
    );
    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found');
    }

    const updated = await this.productRepo.updateVariant(
      variantId,
      organizationId,
      storeId,
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
    const { organizationId, storeId } = requireStoreContext(tenant);
    const product = await this.productRepo.findById(
      productId,
      organizationId,
      storeId,
    );
    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found');
    }

    const detail = await this.productRepo.findDetail(
      productId,
      organizationId,
      storeId,
    );
    if (detail && detail.variants.length <= 1) {
      throw new BadRequestException('Product must have at least one variant');
    }

    await this.productRepo.deleteVariant(variantId, organizationId, storeId);
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
    const { organizationId, storeId } = requireStoreContext(tenant);
    const product = await this.productRepo.findById(
      productId,
      organizationId,
      storeId,
    );
    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found');
    }
    return this.productRepo.addMedia({
      organizationId,
      storeId,
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
    const { organizationId, storeId } = requireStoreContext(tenant);
    const product = await this.productRepo.findById(
      productId,
      organizationId,
      storeId,
    );
    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found');
    }
    await this.productRepo.deleteMedia(mediaId, organizationId, storeId);
  }

  async reorderMedia(
    productId: string,
    orderedIds: string[],
    tenant: TenantContext,
  ): Promise<void> {
    const { organizationId, storeId } = requireStoreContext(tenant);
    const product = await this.productRepo.findById(
      productId,
      organizationId,
      storeId,
    );
    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found');
    }
    await this.productRepo.reorderMedia(
      productId,
      organizationId,
      storeId,
      orderedIds,
    );
  }

  async findMany(
    filter: ProductFilterDto,
    tenant: TenantContext,
  ): Promise<Product[]> {
    const { organizationId, storeId } = requireStoreContext(tenant);
    const result = await this.productRepo.findWithFilters(
      filter,
      organizationId,
      storeId,
    );
    return result.items;
  }

  /**
   * Reject duplicate option names within a product, and duplicate values
   * within a single option (both case-insensitive). The DB enforces this too
   * via unique constraints; this gives the caller a clean 409 instead of a raw
   * constraint error.
   */
  private assertOptionsUnique(
    options: { name: string; values?: { value: string }[] }[],
  ): void {
    const seenNames = new Set<string>();
    for (const opt of options) {
      const name = opt.name.trim().toLowerCase();
      if (seenNames.has(name)) {
        throw new ConflictException(
          `Duplicate option name "${opt.name}". Each option must be unique for a product.`,
        );
      }
      seenNames.add(name);

      const seenValues = new Set<string>();
      for (const v of opt.values ?? []) {
        const value = v.value.trim().toLowerCase();
        if (seenValues.has(value)) {
          throw new ConflictException(
            `Duplicate value "${v.value}" for option "${opt.name}".`,
          );
        }
        seenValues.add(value);
      }
    }
  }

  private async createVariantInternal(
    productId: string,
    organizationId: string,
    storeId: string,
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
      initialStock?: number;
    },
    defaultPosition = 0,
  ): Promise<ProductVariant> {
    const skuTaken = await this.productRepo.skuExists(
      dto.sku,
      organizationId,
      storeId,
    );
    if (skuTaken) {
      throw new ConflictException(`SKU "${dto.sku}" already exists`);
    }

    const variant = await this.productRepo.createVariant({
      organizationId,
      storeId,
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

    await this.inventoryService.createForVariant(
      variant.id,
      organizationId,
      storeId,
      dto.initialStock ?? 0,
    );

    return variant;
  }
}
