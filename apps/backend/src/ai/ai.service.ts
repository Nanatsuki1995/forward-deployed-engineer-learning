import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AiLogType } from '@prisma/client';
import { mapAiLog } from '../data/workbench.mapper';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { AiProvider, AiProviderOutput } from './ai-provider.interface';
import { AI_PROVIDER_TOKEN } from './ai-provider.factory';
import { DeepSeekAiProvider } from './deepseek-ai.provider';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(AI_PROVIDER_TOKEN) private readonly aiProvider: AiProvider,
  ) {}

  async createReplySuggestion(ticketId: string, user?: AuthenticatedUser) {
    const ticket = await this.getTicketOrThrow(ticketId);

    const documents = await this.prisma.knowledgeDocument.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      where: { status: 'INDEXED' },
    });

    const knowledgeContext =
      documents.length > 0
        ? documents.map((doc) => doc.content).join('\n---\n')
        : undefined;

    const output = await this.callWithFallback(
      () =>
        this.aiProvider.generateReplySuggestion({
          ticketTitle: ticket.title,
          ticketDescription: ticket.description,
          ticketCategory: ticket.category,
          ticketPriority: ticket.priority,
          requester: ticket.requester,
          assignee: ticket.assignee ?? '未分配',
          knowledgeContext,
        }),
      {
        result: [
          `${ticket.requester}，您好。我们已收到"${ticket.title}"工单。`,
          `根据当前分类"${ticket.category}"和优先级"${ticket.priority.toLowerCase()}"，建议先确认主责部门、数据权限和人工复核人。`,
          '系统会保留处理记录、引用来源和人工确认结果，避免 AI 自动执行高风险动作。',
        ].join('\n'),
        confidence: ticket.priority === 'URGENT' ? 0.72 : 0.84,
        citations: documents.map((doc) => doc.title),
      },
    );

    const citations = [
      ...output.citations,
      ...documents.map((doc) => doc.title),
    ];

    const log = await this.prisma.aiLog.create({
      data: {
        ticketId,
        type: AiLogType.REPLY_SUGGESTION,
        promptVersion: 'fde-ticket-assistant-v2',
        model: this.getModelName(),
        result: output.result,
        confidence: output.confidence,
        citations,
        actorId: user?.id ?? null,
      },
    });

    return mapAiLog(log);
  }

  async createSummary(ticketId: string, user?: AuthenticatedUser) {
    const ticket = await this.getTicketOrThrow(ticketId);

    const output = await this.callWithFallback(
      () =>
        this.aiProvider.generateSummary({
          ticketTitle: ticket.title,
          ticketDescription: ticket.description,
          ticketStatus: ticket.status,
          ticketPriority: ticket.priority,
          assignee: ticket.assignee ?? '未分配',
          ticketTags: ticket.tags,
        }),
      {
        result: [
          `工单摘要：${ticket.description}`,
          `当前状态：${ticket.status.toLowerCase()}`,
          `建议下一步：由 ${ticket.assignee} 确认责任边界，并将处理方案提交人工审核。`,
        ].join('\n'),
        confidence: 0.88,
        citations: ticket.tags,
      },
    );

    const log = await this.prisma.aiLog.create({
      data: {
        ticketId,
        type: AiLogType.SUMMARY,
        promptVersion: 'fde-ticket-assistant-v2',
        model: this.getModelName(),
        result: output.result,
        confidence: output.confidence,
        citations: output.citations,
        actorId: user?.id ?? null,
      },
    });

    return mapAiLog(log);
  }

  async findLogs() {
    const logs = await this.prisma.aiLog.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return logs.map(mapAiLog);
  }

  private async getTicketOrThrow(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }

    return ticket;
  }

  private getModelName(): string {
    return this.aiProvider instanceof DeepSeekAiProvider
      ? 'deepseek-v4-pro'
      : 'mock-llm-local';
  }

  private async callWithFallback(
    fn: () => Promise<AiProviderOutput>,
    fallback: AiProviderOutput,
  ): Promise<AiProviderOutput> {
    try {
      return await fn();
    } catch (error) {
      const isDeepSeek = this.aiProvider instanceof DeepSeekAiProvider;
      if (!isDeepSeek) {
        throw error;
      }

      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `DeepSeek API call failed, falling back to mock: ${errMsg}`,
      );

      return fallback;
    }
  }
}
