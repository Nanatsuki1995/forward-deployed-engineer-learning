import { Injectable, NotFoundException } from '@nestjs/common';
import { AiLogType } from '@prisma/client';
import { mapAiLog } from '../data/workbench.mapper';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  async createReplySuggestion(ticketId: string) {
    const ticket = await this.getTicketOrThrow(ticketId);
    const documents = await this.prisma.knowledgeDocument.findMany({
      take: 2,
      orderBy: { createdAt: 'desc' },
    });
    const citations = documents.map((document) => document.title);
    const result = [
      `${ticket.requester}，您好。我们已收到“${ticket.title}”工单。`,
      `根据当前分类“${ticket.category}”和优先级“${ticket.priority.toLowerCase()}”，建议先确认主责部门、数据权限和人工复核人。`,
      '系统会保留处理记录、引用来源和人工确认结果，避免 AI 自动执行高风险动作。',
    ].join('\n');

    const log = await this.prisma.aiLog.create({
      data: {
        ticketId,
        type: AiLogType.REPLY_SUGGESTION,
        promptVersion: 'fde-ticket-assistant-v1',
        model: 'mock-llm-local',
        result,
        confidence: ticket.priority === 'URGENT' ? 0.72 : 0.84,
        citations,
      },
    });

    return mapAiLog(log);
  }

  async createSummary(ticketId: string) {
    const ticket = await this.getTicketOrThrow(ticketId);
    const result = [
      `工单摘要：${ticket.description}`,
      `当前状态：${ticket.status.toLowerCase()}`,
      `建议下一步：由 ${ticket.assignee} 确认责任边界，并将处理方案提交人工审核。`,
    ].join('\n');

    const log = await this.prisma.aiLog.create({
      data: {
        ticketId,
        type: AiLogType.SUMMARY,
        promptVersion: 'fde-ticket-assistant-v1',
        model: 'mock-llm-local',
        result,
        confidence: 0.88,
        citations: ticket.tags,
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
}
