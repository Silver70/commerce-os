import { Module } from '@nestjs/common';
import { AnalyticsService } from './services/analytics.service';
import { EventIngestService } from './services/event-ingest.service';
import { AdminAnalyticsController } from './controllers/admin-analytics.controller';
import { StorefrontEventsController } from './controllers/storefront-events.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AdminAnalyticsController, StorefrontEventsController],
  providers: [AnalyticsService, EventIngestService],
  exports: [AnalyticsService, EventIngestService],
})
export class AnalyticsModule {}
