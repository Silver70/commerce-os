import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminAuthGuard } from '../../auth/guards/admin-auth.guard';
import { RbacGuard } from '../../auth/guards/rbac.guard';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { CurrentTenant } from '../../auth/decorators/current-tenant.decorator';
import { ProductService } from '../services/product.service';
import { CategoryService } from '../services/category.service';
import { R2StorageService } from '../../../shared/storage/r2-storage.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { CreateVariantDto } from '../dto/create-variant.dto';
import { UpdateVariantDto } from '../dto/update-variant.dto';
import { ProductFilterDto } from '../dto/product-filter.dto';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { randomUUID } from 'crypto';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard, RbacGuard)
@Controller('admin/products')
export class AdminProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly categoryService: CategoryService,
    private readonly storageService: R2StorageService,
  ) {}

  @Get()
  @RequirePermission('products.read')
  @ApiOperation({ summary: 'List products with filters and cursor pagination' })
  @ApiResponse({ status: 200 })
  async list(
    @Query() filter: ProductFilterDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.productService.list(filter, tenant);
  }

  @Post()
  @RequirePermission('products.create')
  @ApiOperation({ summary: 'Create a new product with options and variants' })
  @ApiResponse({ status: 201 })
  async create(
    @Body() dto: CreateProductDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.productService.create(dto, tenant);
  }

  @Get(':id')
  @RequirePermission('products.read')
  @ApiOperation({
    summary: 'Get product detail with variants, options, and media',
  })
  async getById(
    @Param('id') id: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.productService.getDetail(id, tenant);
  }

  @Patch(':id')
  @RequirePermission('products.update')
  @ApiOperation({ summary: 'Update product fields' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.productService.update(id, dto, tenant);
  }

  @Delete(':id')
  @RequirePermission('products.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a product' })
  async softDelete(
    @Param('id') id: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    await this.productService.softDelete(id, tenant);
  }

  @Post(':id/variants')
  @RequirePermission('products.create')
  @ApiOperation({ summary: 'Add a variant to a product' })
  async createVariant(
    @Param('id') productId: string,
    @Body() dto: CreateVariantDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.productService.createVariant(productId, dto, tenant);
  }

  @Patch(':id/variants/:vid')
  @RequirePermission('products.update')
  @ApiOperation({ summary: 'Update a product variant' })
  async updateVariant(
    @Param('id') productId: string,
    @Param('vid') variantId: string,
    @Body() dto: UpdateVariantDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.productService.updateVariant(productId, variantId, dto, tenant);
  }

  @Delete(':id/variants/:vid')
  @RequirePermission('products.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product variant' })
  async deleteVariant(
    @Param('id') productId: string,
    @Param('vid') variantId: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    await this.productService.deleteVariant(productId, variantId, tenant);
  }

  @Post(':id/media')
  @RequirePermission('products.update')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload media for a product' })
  async uploadMedia(
    @Param('id') productId: string,
    @CurrentTenant() tenant: TenantContext,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp|gif)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('altText') altText?: string,
    @Body('position') position?: string,
    @Body('variantId') variantId?: string,
  ) {
    const key = `products/${productId}/${randomUUID()}-${file.originalname}`;
    const url = await this.storageService.upload(
      key,
      file.buffer,
      file.mimetype,
    );
    return this.productService.addMedia(productId, url, tenant, {
      altText,
      mediaType: 'image',
      position: position ? parseInt(position, 10) : undefined,
      variantId,
    });
  }

  @Delete(':id/media/:mid')
  @RequirePermission('products.update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product media item' })
  async deleteMedia(
    @Param('id') productId: string,
    @Param('mid') mediaId: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    await this.productService.deleteMedia(productId, mediaId, tenant);
  }

  @Patch(':id/media/reorder')
  @RequirePermission('products.update')
  @ApiOperation({ summary: 'Reorder product media items' })
  async reorderMedia(
    @Param('id') productId: string,
    @Body('orderedIds') orderedIds: string[],
    @CurrentTenant() tenant: TenantContext,
  ) {
    await this.productService.reorderMedia(productId, orderedIds, tenant);
    return { success: true };
  }
}

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard, RbacGuard)
@Controller('admin/categories')
export class AdminCategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @RequirePermission('products.read')
  @ApiOperation({ summary: 'Get category tree' })
  async getTree(@CurrentTenant() tenant: TenantContext) {
    return this.categoryService.getTree(tenant);
  }

  @Post()
  @RequirePermission('products.create')
  @ApiOperation({ summary: 'Create a category' })
  async create(
    @Body() dto: CreateCategoryDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.categoryService.create(dto, tenant);
  }

  @Get(':id')
  @RequirePermission('products.read')
  @ApiOperation({ summary: 'Get a category by ID' })
  async getById(
    @Param('id') id: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.categoryService.getById(id, tenant);
  }

  @Patch(':id')
  @RequirePermission('products.update')
  @ApiOperation({ summary: 'Update a category' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.categoryService.update(id, dto, tenant);
  }

  @Delete(':id')
  @RequirePermission('products.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a category' })
  async delete(
    @Param('id') id: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    await this.categoryService.delete(id, tenant);
  }
}
