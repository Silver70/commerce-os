import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  const configService = app.get(ConfigService);

  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );

  const corsOrigins = configService.get<string>('CORS_ORIGINS', '');
  app.enableCors({
    origin: corsOrigins ? corsOrigins.split(',').map((o) => o.trim()) : true,
    credentials: true,
  });

  app.setGlobalPrefix('api', {
    exclude: ['/graphql'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Commerce OS API')
    .setDescription('Headless commerce engine admin REST API')
    .setVersion('1.0')
    .addCookieAuth('wos-session')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  app.enableShutdownHooks();

  const port = configService.get<number>('PORT', 4000);
  await app.listen(port);
}

void bootstrap();
