import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/common/app-config';
import { PrismaService } from './../src/prisma/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  it('/api/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((response) => {
        const body = response.body as { status: string; service: string };

        expect(body.status).toBe('ok');
        expect(body.service).toBe('fde-learning-backend');
      });
  });

  it('/api/auth/login (POST) returns the unified validation error shape', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'not-an-email', extra: true })
      .expect(400)
      .expect((response) => {
        const body = response.body as {
          error?: {
            code?: string;
            message?: string;
            details?: string[];
          };
          meta?: {
            path?: string;
            method?: string;
            statusCode?: number;
          };
        };

        expect(body.error?.code).toBe('VALIDATION_FAILED');
        expect(body.error?.message).toEqual(expect.any(String));
        expect(body.error?.details).toEqual(
          expect.arrayContaining([
            expect.stringContaining('email must be an email'),
            expect.stringContaining('property extra should not exist'),
          ]),
        );
        expect(body.meta).toEqual(
          expect.objectContaining({
            path: '/api/auth/login',
            method: 'POST',
            statusCode: 400,
          }),
        );
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
