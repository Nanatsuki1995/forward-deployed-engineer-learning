import {
  BadRequestException,
  type INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './filters/http-exception.filter';

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const messages = errors.flatMap((error) =>
          Object.values(error.constraints ?? {}),
        );

        return new BadRequestException({
          code: 'VALIDATION_FAILED',
          message: messages.length > 0 ? messages : ['Validation failed'],
        });
      },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
}

export function configureSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('FDE Learning Work Order API')
    .setDescription('AI 工单助手后端 API 文档')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
