import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'debug', 'log', 'verbose'],
  });
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://ijodea.github.io', // GitHub Pages 도메인 추가
    ],
    credentials: true,
  });
  await app.listen(8000);
}
bootstrap();
