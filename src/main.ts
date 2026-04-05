import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // ─── Global prefix ────────────────────────────────────────────────────────
  app.setGlobalPrefix('api');

  // ─── CORS ─────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: config.get<string>('CLIENT_URL', 'http://localhost:4200'),
    credentials: true,
  });

  // ─── Global validation ────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown properties
      forbidNonWhitelisted: true, // throw on unknown properties
      transform: true, // auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // convert query params to correct types
      },
    }),
  );

  // ─── Start ────────────────────────────────────────────────────────────────
  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api`);
}

bootstrap();
