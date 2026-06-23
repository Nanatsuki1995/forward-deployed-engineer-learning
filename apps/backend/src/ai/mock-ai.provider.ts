import { Injectable } from '@nestjs/common';
import type {
  AiProvider,
  AiProviderOutput,
  AiReplySuggestionInput,
  AiSummaryInput,
} from './ai-provider.interface';

@Injectable()
export class MockAiProvider implements AiProvider {
  generateReplySuggestion(
    input: AiReplySuggestionInput,
  ): Promise<AiProviderOutput> {
    const result = [
      `${input.requester}，您好。我们已收到"${input.ticketTitle}"工单。`,
      `根据当前分类"${input.ticketCategory}"和优先级"${input.ticketPriority.toLowerCase()}"，建议先确认主责部门、数据权限和人工复核人。`,
      '系统会保留处理记录、引用来源和人工确认结果，避免 AI 自动执行高风险动作。',
    ].join('\n');

    return Promise.resolve({
      result,
      confidence: input.ticketPriority === 'URGENT' ? 0.72 : 0.84,
      citations: input.knowledgeContext ? ['知识库文档'] : [],
    });
  }

  generateSummary(input: AiSummaryInput): Promise<AiProviderOutput> {
    const result = [
      `工单摘要：${input.ticketDescription}`,
      `当前状态：${input.ticketStatus.toLowerCase()}`,
      `建议下一步：由 ${input.assignee} 确认责任边界，并将处理方案提交人工审核。`,
    ].join('\n');

    return Promise.resolve({
      result,
      confidence: 0.88,
      citations: input.ticketTags,
    });
  }
}
