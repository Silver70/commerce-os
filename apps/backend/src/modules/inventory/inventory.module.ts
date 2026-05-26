import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { InventoryRepository } from './repositories/inventory.repository';
import { InventoryService } from './services/inventory.service';
import { AdminInventoryController } from './controllers/admin-inventory.controller';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [AdminInventoryController],
  providers: [InventoryRepository, InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
