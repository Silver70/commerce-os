import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { generateUniqueSlug } from '../../../shared/utils/slug.util';
import { CategoryRepository } from '../repositories/category.repository';
import type { CategoryTreeNode } from '../repositories/category.repository';
import type { Category } from '../../../shared/database/schema';
import type { CreateCategoryDto } from '../dto/create-category.dto';
import type { UpdateCategoryDto } from '../dto/update-category.dto';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { requireStoreContext } from '../../../shared/tenant/tenant.util';

@Injectable()
export class CategoryService {
  constructor(private readonly categoryRepo: CategoryRepository) {}

  async getTree(tenant: TenantContext): Promise<CategoryTreeNode[]> {
    const { organizationId, storeId } = requireStoreContext(tenant);
    return this.categoryRepo.getTree(organizationId, storeId);
  }

  async getBySlug(slug: string, tenant: TenantContext): Promise<Category> {
    const { organizationId, storeId } = requireStoreContext(tenant);
    const cat = await this.categoryRepo.findBySlug(
      slug,
      organizationId,
      storeId,
    );
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async getById(id: string, tenant: TenantContext): Promise<Category> {
    const { organizationId, storeId } = requireStoreContext(tenant);
    const cat = await this.categoryRepo.findById(id, organizationId, storeId);
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async create(
    dto: CreateCategoryDto,
    tenant: TenantContext,
  ): Promise<Category> {
    const { organizationId, storeId } = requireStoreContext(tenant);

    if (dto.parentId) {
      const parent = await this.categoryRepo.findById(
        dto.parentId,
        organizationId,
        storeId,
      );
      if (!parent) {
        throw new BadRequestException('Parent category not found');
      }
    }

    const slug = await generateUniqueSlug(dto.name, (s) =>
      this.categoryRepo.slugExists(s, organizationId, storeId),
    );

    return this.categoryRepo.create({
      organizationId,
      storeId,
      name: dto.name,
      slug,
      parentId: dto.parentId,
      description: dto.description,
      position: dto.position ?? 0,
    });
  }

  async update(
    id: string,
    dto: UpdateCategoryDto,
    tenant: TenantContext,
  ): Promise<Category> {
    const { organizationId, storeId } = requireStoreContext(tenant);
    const existing = await this.categoryRepo.findById(
      id,
      organizationId,
      storeId,
    );
    if (!existing) throw new NotFoundException('Category not found');

    if (dto.parentId && dto.parentId === id) {
      throw new BadRequestException('A category cannot be its own parent');
    }

    const patch: Record<string, unknown> = {};
    if (dto.name && dto.name !== existing.name) {
      patch.name = dto.name;
      patch.slug = await generateUniqueSlug(dto.name, (s) =>
        this.categoryRepo.slugExists(s, organizationId, storeId),
      );
    }
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.parentId !== undefined) patch.parentId = dto.parentId;
    if (dto.position !== undefined) patch.position = dto.position;

    if (Object.keys(patch).length === 0) return existing;

    const updated = await this.categoryRepo.update(
      id,
      organizationId,
      storeId,
      patch,
    );
    if (!updated)
      throw new NotFoundException('Category not found after update');
    return updated;
  }

  async delete(id: string, tenant: TenantContext): Promise<void> {
    const { organizationId, storeId } = requireStoreContext(tenant);
    const existing = await this.categoryRepo.findById(
      id,
      organizationId,
      storeId,
    );
    if (!existing) throw new NotFoundException('Category not found');
    await this.categoryRepo.delete(id, organizationId, storeId);
  }

  async getAncestors(
    categoryId: string,
    tenant: TenantContext,
  ): Promise<Category[]> {
    const { organizationId, storeId } = requireStoreContext(tenant);
    return this.categoryRepo.getAncestors(categoryId, organizationId, storeId);
  }
}
