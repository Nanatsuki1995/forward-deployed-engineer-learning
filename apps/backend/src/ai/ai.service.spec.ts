import { AiLogType, type AiLog } from '@prisma/client';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AiProvider } from './ai-provider.interface';
import { AiService } from './ai.service';

type AiLogCreateData = Omit<AiLog, 'id' | 'createdAt'>;
type AiLogCreateArgs = { data: AiLogCreateData };

describe('AiService', () => {
  it('persists token usage when creating an AI summary log', async () => {
    const createdAt = new Date('2026-06-29T00:00:00.000Z');
    const createAiLog = jest.fn(
      ({ data }: AiLogCreateArgs): AiLog => ({
        id: 'ai-log-1',
        ...data,
        actorId: data.actorId ?? null,
        createdAt,
      }),
    );
    const prisma = {
      ticket: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'ticket-1',
          title: '企业知识库权限不一致',
          description: '销售团队能看到售后知识条目。',
          status: 'IN_PROGRESS',
          priority: 'MEDIUM',
          assignee: '平台工程师',
          tags: ['RBAC', '知识库'],
        }),
      },
      aiLog: {
        create: createAiLog,
      },
    };
    const aiProvider: AiProvider = {
      generateReplySuggestion: jest.fn(),
      generateSummary: jest.fn().mockResolvedValue({
        result: '工单摘要：权限配置需要核对并提交人工审核。',
        confidence: 0.9,
        citations: ['RBAC'],
        usage: {
          promptTokens: 120,
          completionTokens: 60,
          totalTokens: 180,
          cachedPromptTokens: 80,
          cacheMissPromptTokens: 40,
          reasoningTokens: 12,
          apiCallCount: 1,
          estimatedCostUsd: 0.000072,
        },
      }),
    };
    const service = new AiService(
      prisma as unknown as PrismaService,
      {} as KnowledgeService,
      aiProvider,
    );

    const result = await service.createSummary('ticket-1', {
      id: 'user-1',
      email: 'agent@example.com',
      name: '现场交付工程师',
      role: 'agent',
    });

    const createCall = createAiLog.mock.calls[0]?.[0];

    expect(createCall?.data).toEqual(
      expect.objectContaining({
        ticketId: 'ticket-1',
        type: AiLogType.SUMMARY,
        promptTokens: 120,
        completionTokens: 60,
        totalTokens: 180,
        cachedPromptTokens: 80,
        cacheMissPromptTokens: 40,
        reasoningTokens: 12,
        apiCallCount: 1,
        estimatedCostUsd: 0.000072,
        actorId: 'user-1',
      }),
    );
    expect(result.usage).toBeUndefined();
  });
});
