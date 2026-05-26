import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import { validationSchema } from './config/configuration';
import { DatabaseModule } from './shared/database/database.module';
import { EventBusModule } from './shared/events/event-bus.module';
import { MoneyScalar } from './shared/graphql/scalars/money.scalar';
import { DateTimeScalar } from './shared/graphql/scalars/date-time.scalar';
import { HealthResolver } from './shared/graphql/health.resolver';
import { R2StorageService } from './shared/storage/r2-storage.service';

import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { AuditModule } from './modules/audit/audit.module';
import { ProductModule } from './modules/product/product.module';
import { InventoryModule } from './modules/inventory/inventory.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
    }),
    DatabaseModule,
    EventBusModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
    ]),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      path: '/graphql',
      context: ({ req }: { req: Express.Request }) => ({ req }),
    }),
    AuthModule,
    TenantModule,
    AuditModule,
    ProductModule,
    InventoryModule,
  ],
  providers: [MoneyScalar, DateTimeScalar, R2StorageService, HealthResolver],
  exports: [R2StorageService],
})
export class AppModule {}
