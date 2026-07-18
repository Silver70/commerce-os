import { Module } from '@nestjs/common';
import { DashboardService } from './services/dashboard.service';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AdminDashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
