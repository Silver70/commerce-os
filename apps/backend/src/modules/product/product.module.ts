import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ProductRepository } from './repositories/product.repository';
import { CategoryRepository } from './repositories/category.repository';
import { ProductService } from './services/product.service';
import { CategoryService } from './services/category.service';
import { ProductResolver } from './resolvers/product.resolver';
import {
  AdminProductController,
  AdminCategoryController,
} from './controllers/admin-product.controller';
import { R2StorageService } from '../../shared/storage/r2-storage.service';

@Module({
  imports: [AuthModule, InventoryModule],
  controllers: [AdminProductController, AdminCategoryController],
  providers: [
    ProductRepository,
    CategoryRepository,
    ProductService,
    CategoryService,
    ProductResolver,
    R2StorageService,
  ],
  exports: [ProductService, CategoryService],
})
export class ProductModule {}
