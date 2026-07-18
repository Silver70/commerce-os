import { Module } from '@nestjs/common';
import { DashboardService } from './services/dashboard.service';
import { AnalyticsService } from './services/analytics.service';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AdminAnalyticsController } from './controllers/admin-analytics.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AdminDashboardController, AdminAnalyticsController],
  providers: [DashboardService, AnalyticsService],
})
export class DashboardModule {}
