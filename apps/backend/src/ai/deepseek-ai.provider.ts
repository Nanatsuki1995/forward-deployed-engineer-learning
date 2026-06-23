import { Injectable, Logger } from '@nestjs/common';
import type {
  AiProvider,
  AiProviderOutput,
  AiReplySuggestionInput,
  AiSummaryInput,
} from './ai-provider.interface';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface ParsedAiResponse {
  result?: string;
  confidence?: number;
  citations?: string[];
}

const REPLY_SYSTEM_PROMPT = `你是一位专业的企业交付工程师助手，负责为工单系统生成回复建议。

你需要根据工单信息生成专业、得体的回复建议。回复要求：
1. 开头礼貌问候，确认收到工单
2. 根据工单分类和优先级给出针对性建议
3. 如果提供了知识库内容，引用相关知识点
4. 提示需要人工确认的关键步骤
5. 避免做出超出权限的承诺

请严格按照以下 JSON 格式输出，不要包含其他内容：
{
  "result": "回复建议的完整文本",
  "confidence": 0.0-1.0之间的置信度数字,
  "citations": ["引用的知识库条目1", "条目2"]
}`;

const SUMMARY_SYSTEM_PROMPT = `你是一位专业的企业交付工程师助手，负责为工单生成结构化摘要。

你需要根据工单信息生成清晰的摘要。要求：
1. 提炼工单核心问题
2. 总结当前处理状态
3. 给出建议的下一步行动
4. 评估紧急程度

请严格按照以下 JSON 格式输出，不要包含其他内容：
{
  "result": "工单摘要的完整文本",
  "confidence": 0.0-1.0之间的置信度数字,
  "citations": ["相关标签或分类"]
}`;

@Injectable()
export class DeepSeekAiProvider implements AiProvider {
  private readonly logger = new Logger(DeepSeekAiProvider.name);
  private readonly apiBase: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor() {
    this.apiBase = (
      process.env.DEEPSEEK_API_BASE ?? 'https://api.deepseek.com'
    ).replace(/\/$/, '');
    this.apiKey = process.env.DEEPSEEK_API_KEY ?? '';
    this.model = process.env.DEEPSEEK_MODEL ?? 'deepseek-v4-pro';
  }

  async generateReplySuggestion(
    input: AiReplySuggestionInput,
  ): Promise<AiProviderOutput> {
    this.validateApiKey();

    const userMessage = [
      `工单标题：${input.ticketTitle}`,
      `工单描述：${input.ticketDescription}`,
      `工单分类：${input.ticketCategory}`,
      `优先级：${input.ticketPriority}`,
      `请求人：${input.requester}`,
      `负责人：${input.assignee}`,
      input.knowledgeContext
        ? `相关知识库内容：\n${input.knowledgeContext}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    const rawOutput = await this.chat([
      { role: 'system', content: REPLY_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ]);

    return this.parseOutput(rawOutput);
  }

  async generateSummary(input: AiSummaryInput): Promise<AiProviderOutput> {
    this.validateApiKey();

    const userMessage = [
      `工单标题：${input.ticketTitle}`,
      `工单描述：${input.ticketDescription}`,
      `当前状态：${input.ticketStatus}`,
      `优先级：${input.ticketPriority}`,
      `负责人：${input.assignee}`,
      `标签：${input.ticketTags.join(', ')}`,
    ].join('\n');

    const rawOutput = await this.chat([
      { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ]);

    return this.parseOutput(rawOutput);
  }

  private async chat(messages: ChatMessage[]): Promise<string> {
    const url = `${this.apiBase}/chat/completions`;

    this.logger.log(`Calling DeepSeek API: ${url} with model ${this.model}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.7,
          max_tokens: 2048,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `DeepSeek API error (${response.status}): ${errorBody}`,
        );
      }

      const data = (await response.json()) as ChatCompletionResponse;

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('DeepSeek API returned empty response');
      }

      return content;
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseOutput(raw: string): AiProviderOutput {
    // Try to extract JSON from the response (handle markdown code blocks)
    let jsonStr = raw.trim();

    // Remove markdown ```json ... ``` wrapper if present
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    try {
      const parsed = JSON.parse(jsonStr) as ParsedAiResponse;
      return {
        result: parsed.result ?? raw,
        confidence:
          typeof parsed.confidence === 'number'
            ? Math.max(0, Math.min(1, parsed.confidence))
            : 0.5,
        citations: Array.isArray(parsed.citations) ? parsed.citations : [],
      };
    } catch {
      this.logger.warn(
        'Failed to parse JSON from DeepSeek response, using raw output',
      );
      // Fallback: use the raw output as result
      return {
        result: raw,
        confidence: 0.5,
        citations: [],
      };
    }
  }

  private validateApiKey(): void {
    if (!this.apiKey) {
      throw new Error(
        'DEEPSEEK_API_KEY is required when AI_PROVIDER is set to "deepseek"',
      );
    }
  }
}
