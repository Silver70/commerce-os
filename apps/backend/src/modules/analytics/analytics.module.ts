import { Module } from '@nestjs/common';
import { AnalyticsService } from './services/analytics.service';
import { AdminAnalyticsController } from './controllers/admin-analytics.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AdminAnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
