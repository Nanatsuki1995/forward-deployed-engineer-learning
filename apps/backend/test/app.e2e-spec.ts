import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { TicketPriority, TicketStatus } from '@prisma/client';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/common/app-config';
import { PrismaService } from './../src/prisma/prisma.service';

function makeFakeTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ticket-e2e-001',
    title: 'E2E 测试工单',
    description: '端到端测试工单描述',
    category: '系统故障',
    status: TicketStatus.NEW,
    priority: TicketPriority.HIGH,
    requester: '李四',
    requesterUserId: null,
    assignee: '待分派',
    tags: [],
    source: 'public',
    submitterName: '李四',
    submitterPhone: null,
    submitterEmail: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: [],
    ...overrides,
  };
}

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let prismaMock: Record<string, jest.Mock>;

  beforeEach(async () => {
    prismaMock = {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      ticket: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      } as unknown as Record<string, jest.Mock>,
      user: {
        findMany: jest.fn().mockResolvedValue([]),
      } as unknown as Record<string, jest.Mock>,
      notification: {
        create: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      } as unknown as Record<string, jest.Mock>,
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
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

  describe('Public Ticket Submission (e2e)', () => {
    it('POST /api/tickets/public should create ticket without auth', async () => {
      const mockTicket = makeFakeTicket();
      prismaMock.ticket.create.mockResolvedValueOnce(mockTicket);

      const res = await request(app.getHttpServer())
        .post('/api/tickets/public')
        .send({
          title: 'E2E 测试工单',
          description: '端到端测试工单描述',
          submitterName: '李四',
          category: '系统故障',
          priority: 'high',
        })
        .expect(201);

      expect(res.body.source).toBe('public');
      expect(res.body.submitterName).toBe('李四');
      expect(res.body.requester).toBe('李四');
      expect(res.body.assignee).toBe('待分派');
      expect(res.body.id).toBeDefined();
    });

    it('POST /api/tickets/public should return 400 on missing title', async () => {
      await request(app.getHttpServer())
        .post('/api/tickets/public')
        .send({ description: 'no title' })
        .expect(400);
    });

    it('POST /api/tickets/public should return 400 on empty title', async () => {
      await request(app.getHttpServer())
        .post('/api/tickets/public')
        .send({ title: '', description: 'test' })
        .expect(400);
    });

    it('POST /api/tickets/public should default submitterName to 匿名用户', async () => {
      const mockTicket = makeFakeTicket({
        submitterName: null,
        requester: '匿名用户',
      });
      prismaMock.ticket.create.mockResolvedValueOnce(mockTicket);

      const res = await request(app.getHttpServer())
        .post('/api/tickets/public')
        .send({ title: '匿名工单', description: '无姓名' })
        .expect(201);

      expect(res.body.requester).toBe('匿名用户');
      expect(res.body.source).toBe('public');
    });
  });

  describe('Notifications (e2e)', () => {
    it('GET /api/notifications should return 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/notifications')
        .expect(401);
    });

    it('GET /api/notifications/unread-count should return 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/notifications/unread-count')
        .expect(401);
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
