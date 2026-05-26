import { Module } from '@nestjs/common';
import { AuditService } from './services/audit.service';
import { AdminAuditController } from './controllers/admin-audit.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AdminAuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
