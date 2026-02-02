import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';

async function bootstrap() {

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Security headers
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow resource loading (images)
  }));

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // CORS
  // CORS
  const allowedOrigins = [
    'http://localhost:5173',
    process.env.FRONTEND_URL
  ].filter((origin): origin is string => !!origin);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Static files
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });
  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('TradeCore API')
    .setDescription('Kurumsal E-Commerce API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
  console.log('🚀 TradeCore API running on http://localhost:3000');
  console.log('📚 API Docs: http://localhost:3000/api/docs');
}

bootstrap();