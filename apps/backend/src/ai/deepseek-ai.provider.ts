import { Injectable, Logger } from '@nestjs/common';
import { AiProviderCallError } from './ai-provider.interface';
import type {
  AiProvider,
  AiProviderOutput,
  AiReplySuggestionInput,
  AiSummaryInput,
  AiTokenUsage,
} from './ai-provider.interface';
import { createEmptyAiTokenUsage, mergeAiTokenUsage } from './ai-token-usage';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  prompt_cache_hit_tokens?: number;
  prompt_cache_miss_tokens?: number;
  completion_tokens_details?: {
    reasoning_tokens?: number;
  };
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: ChatCompletionUsage;
}

interface ParsedAiResponse {
  result?: string;
  confidence?: number;
  citations?: string[];
}

interface ChatCallResult {
  content: string;
  usage?: AiTokenUsage;
}

interface CostRates {
  cacheHitInputPerMillionUsd: number;
  cacheMissInputPerMillionUsd: number;
  outputPerMillionUsd: number;
}

const DEEPSEEK_MODEL_COST_RATES: Record<string, CostRates> = {
  'deepseek-v4-flash': {
    cacheHitInputPerMillionUsd: 0.0028,
    cacheMissInputPerMillionUsd: 0.14,
    outputPerMillionUsd: 0.28,
  },
  'deepseek-v4-pro': {
    cacheHitInputPerMillionUsd: 0.003625,
    cacheMissInputPerMillionUsd: 0.435,
    outputPerMillionUsd: 0.87,
  },
  'deepseek-chat': {
    cacheHitInputPerMillionUsd: 0.0028,
    cacheMissInputPerMillionUsd: 0.14,
    outputPerMillionUsd: 0.28,
  },
  'deepseek-reasoner': {
    cacheHitInputPerMillionUsd: 0.0028,
    cacheMissInputPerMillionUsd: 0.14,
    outputPerMillionUsd: 0.28,
  },
};

const ONE_MILLION = 1_000_000;
const COST_PRECISION = 12;

// ─── 优化后 System Prompts ─────────────────────────────────

const REPLY_SYSTEM_PROMPT = `## 角色
你是望江街道政务服务中心的 AI 交付工程师助手。你代表政务服务中心
回复市民和企业诉求。语气要求：专业、得体、有温度，不使用官僚套话。

## 回复规范
1. 开头确认收到工单，表达对问题的理解
2. 针对工单分类给出具体可操作的建议（不是泛泛的"请等待处理"）
3. 如果用户消息中提供了知识库内容，必须引用文件名和具体条文
4. 涉及跨部门协调时，明确指出主责部门和配合部门
5. 紧急工单要给出优先级最高的处理动作
6. 每次回复结尾留出"如有疑问请联系"的出口

## 禁止事项
- 禁止承诺"一定解决""保证完成"或给出明确完成时间节点
- 禁止猜测政策细节，没有依据时说明"需要人工确认后方可回复"
- 禁止透露内部审批流程细节
- 禁止直接答应市民的赔偿或处罚要求

## 输出 JSON Schema
{
  "result": "完整回复文本（包含问候、分析、建议、结尾）",
  "confidence": 0.0-1.0之间的置信度数字,
  "citations": ["引用的知识库文件或政策名称"]
}`;

const SUMMARY_SYSTEM_PROMPT = `## 角色
你是望江街道政务服务中心的 AI 交付工程师助手，负责为工单生成结构化摘要。

## 摘要规范
1. 用 1-2 句话提炼工单核心问题
2. 总结当前处理状态和已采取的措施
3. 根据优先级给出建议的下一步行动
4. 评估紧急程度和影响范围

## 输出 JSON Schema
{
  "result": "结构化摘要文本（问题提炼 + 当前状态 + 下一步建议）",
  "confidence": 0.0-1.0之间的置信度数字,
  "citations": ["相关标签或分类"]
}`;

// ─── Few-shot 示例库 ──────────────────────────────────────

const REPLY_FEWSHOT_EXAMPLES: Record<string, string> = {
  城市治理: `
## 示例：理想回复格式
工单：小区垃圾清运不及时（分类：城市治理，优先级：紧急）

理想回复：
{
  "result": "尊敬的市民您好。关于XX小区垃圾清运不及时的问题，我们已收到并充分理解您的困扰。根据《望江街道市容环境卫生管理细则》第十二条，小区物业自管区域的垃圾清运由物业公司负责，街道负责监督协调。建议立即：(1) 通知物业48小时内完成清运；(2) 安排网格员现场核查；(3) 如物业未按时整改，由城管执法介入。如有疑问请联系望江街道热线中心。",
  "confidence": 0.92,
  "citations": ["望江街道市容环境卫生管理细则"]
}`,
  default: `
## 示例：理想回复格式
工单：部门间数据共享权限申请（分类：企业知识管理，优先级：中）

理想回复：
{
  "result": "您好。关于部门间数据共享权限的申请已收到。根据当前权限管理规范，跨部门数据共享需要：(1) 数据归属部门负责人审批；(2) 信息安全部门备案；(3) 设置最小必要权限。建议先确认数据归属部门，再提交共享申请。您的工单已转入处理流程，如有疑问请联系系统管理员。",
  "confidence": 0.88,
  "citations": ["知识库权限与审计规范"]
}`,
};

const SUMMARY_FEWSHOT_EXAMPLE = `
## 示例：理想摘要格式
工单标题：企业知识库权限不一致
工单描述：销售团队可越权查看售后知识条目，售后团队缺少合同附件查看权限

理想摘要：
{
  "result": "工单摘要：企业知识库存在 RBAC 权限不一致问题——销售团队越权访问售后知识条目，售后团队缺少合同附件查看权限，影响售后回复效率。当前状态：平台工程师处理中(IN_PROGRESS)。建议下一步：审计角色定义与资源映射，修正策略并验证最小权限原则。紧急程度：中等，但涉及数据安全合规，建议优先处理。",
  "confidence": 0.95,
  "citations": ["RBAC", "知识库", "审计"]
}`;

// ─── 输出验证 ─────────────────────────────────────────────

interface ValidationContext {
  ticketPriority: string;
  minLength: number;
}

function validateOutput(
  output: AiProviderOutput,
  context: ValidationContext,
): { valid: boolean; reason?: string } {
  // 1. 必要字段检查
  if (!output.result || output.result.trim().length < context.minLength) {
    return {
      valid: false,
      reason: `内容过短 (${output.result?.length ?? 0} < ${context.minLength} chars)`,
    };
  }

  // 2. 置信度阈值
  if (output.confidence < 0.6) {
    return {
      valid: false,
      reason: `置信度过低 (${output.confidence} < 0.6)`,
    };
  }

  // 3. 禁止词检查（防止幻觉和过度承诺）
  const bannedPatterns = [
    /一定解决/g,
    /保证完成/g,
    /24小时内/g,
    /马上处理/g,
    /包你/g,
    /肯定没问题/g,
  ];
  for (const pattern of bannedPatterns) {
    if (pattern.test(output.result)) {
      return {
        valid: false,
        reason: `包含禁止词: ${pattern.source}`,
      };
    }
  }

  // 4. 紧急工单必须有引用来源
  if (context.ticketPriority === 'URGENT' && output.citations.length === 0) {
    return {
      valid: false,
      reason: '紧急工单必须包含引用来源',
    };
  }

  return { valid: true };
}

// ─── Provider 实现 ────────────────────────────────────────

@Injectable()
export class DeepSeekAiProvider implements AiProvider {
  private readonly logger = new Logger(DeepSeekAiProvider.name);
  private readonly apiBase: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly costRates: CostRates | null;
  private readonly maxRetries = 2;

  constructor() {
    this.apiBase = (
      process.env.DEEPSEEK_API_BASE ?? 'https://api.deepseek.com'
    ).replace(/\/$/, '');
    this.apiKey = process.env.DEEPSEEK_API_KEY ?? '';
    this.model = process.env.DEEPSEEK_MODEL ?? 'deepseek-v4-pro';
    this.costRates = resolveCostRates(this.model);
  }

  async generateReplySuggestion(
    input: AiReplySuggestionInput,
  ): Promise<AiProviderOutput> {
    this.validateApiKey();

    const isComplex = input.ticketPriority === 'URGENT';
    const example =
      REPLY_FEWSHOT_EXAMPLES[input.ticketCategory] ??
      REPLY_FEWSHOT_EXAMPLES.default;

    const userMessage = [
      example,
      '---',
      '## 当前工单（请参照上述示例的格式、语气和详细程度回复）',
      `工单标题：${input.ticketTitle}`,
      `工单描述：${input.ticketDescription}`,
      `工单分类：${input.ticketCategory}`,
      `优先级：${input.ticketPriority}`,
      `请求人：${input.requester}`,
      `负责人：${input.assignee}`,
      input.knowledgeContext
        ? `## 相关知识库内容（请在回复中引用）\n${input.knowledgeContext}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    return this.chatWithRetry(
      [
        { role: 'system', content: REPLY_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      isComplex,
      { ticketPriority: input.ticketPriority, minLength: 80 },
    );
  }

  async generateSummary(input: AiSummaryInput): Promise<AiProviderOutput> {
    this.validateApiKey();

    const userMessage = [
      SUMMARY_FEWSHOT_EXAMPLE,
      '---',
      '## 当前工单（请参照上述示例的格式生成摘要）',
      `工单标题：${input.ticketTitle}`,
      `工单描述：${input.ticketDescription}`,
      `当前状态：${input.ticketStatus}`,
      `优先级：${input.ticketPriority}`,
      `负责人：${input.assignee}`,
      `标签：${input.ticketTags.join(', ')}`,
    ].join('\n');

    return this.chatWithRetry(
      [
        { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      false,
      { ticketPriority: input.ticketPriority, minLength: 60 },
    );
  }

  // ─── 核心调用（带重试） ──────────────────────────────────

  private async chatWithRetry(
    messages: ChatMessage[],
    enableThinking: boolean,
    validation: ValidationContext,
  ): Promise<AiProviderOutput> {
    let lastError: string | undefined;
    let totalUsage = createEmptyAiTokenUsage();

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        totalUsage = mergeAiTokenUsage(
          totalUsage,
          createEmptyAiTokenUsage({ apiCallCount: 1 }),
        );

        const rawOutput = await this.chat(messages, enableThinking);
        totalUsage = mergeAiTokenUsage(totalUsage, rawOutput.usage);

        const output = this.parseOutput(rawOutput.content);
        const result = validateOutput(output, validation);

        if (result.valid) {
          if (attempt > 0) {
            this.logger.log(`Succeeded on retry ${attempt}`);
          }
          return {
            ...output,
            usage: totalUsage,
          };
        }

        lastError = result.reason;
        this.logger.warn(
          `Attempt ${attempt + 1}/${this.maxRetries + 1} failed validation: ${result.reason}`,
        );
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Attempt ${attempt + 1}/${this.maxRetries + 1} threw: ${lastError}`,
        );
      }
    }

    // 所有重试失败，返回降级结果
    this.logger.error(
      `All ${this.maxRetries + 1} attempts failed. Last error: ${lastError}`,
    );
    throw new AiProviderCallError(
      `DeepSeek API call failed after retries: ${lastError}`,
      totalUsage,
    );
  }

  // ─── API 调用 ────────────────────────────────────────────

  private async chat(
    messages: ChatMessage[],
    enableThinking: boolean,
  ): Promise<ChatCallResult> {
    const url = `${this.apiBase}/chat/completions`;

    this.logger.log(
      `Calling DeepSeek API: ${url} model=${this.model} thinking=${enableThinking}`,
    );

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      // 采样参数对齐 DeepSeek 官方推荐
      temperature: 1.0,
      top_p: 1.0,
      max_tokens: 4096,
      // JSON Mode：保证输出合法 JSON
      response_format: { type: 'json_object' },
    };

    // Thinking 推理模式：按工单复杂度动态启用
    if (enableThinking) {
      body.thinking = { type: 'enabled' };
      body.reasoning_effort = 'high';
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
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

      return {
        content,
        usage: this.parseUsage(data.usage),
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  // ─── Token / 成本统计 ────────────────────────────────────

  private parseUsage(usage: ChatCompletionUsage | undefined): AiTokenUsage {
    if (!usage) {
      return createEmptyAiTokenUsage();
    }

    const promptTokens = normalizeTokenCount(usage.prompt_tokens);
    const completionTokens = normalizeTokenCount(usage.completion_tokens);
    const cachedPromptTokens = normalizeTokenCount(
      usage.prompt_cache_hit_tokens,
    );
    const cacheMissPromptTokens =
      typeof usage.prompt_cache_miss_tokens === 'number'
        ? normalizeTokenCount(usage.prompt_cache_miss_tokens)
        : Math.max(promptTokens - cachedPromptTokens, 0);
    const totalTokens =
      typeof usage.total_tokens === 'number'
        ? normalizeTokenCount(usage.total_tokens)
        : promptTokens + completionTokens;
    const reasoningTokens = normalizeTokenCount(
      usage.completion_tokens_details?.reasoning_tokens,
    );

    return createEmptyAiTokenUsage({
      promptTokens,
      completionTokens,
      totalTokens,
      cachedPromptTokens,
      cacheMissPromptTokens,
      reasoningTokens,
      estimatedCostUsd: this.estimateCostUsd({
        cachedPromptTokens,
        cacheMissPromptTokens,
        completionTokens,
      }),
    });
  }

  private estimateCostUsd(input: {
    cachedPromptTokens: number;
    cacheMissPromptTokens: number;
    completionTokens: number;
  }): number | null {
    if (!this.costRates) {
      return null;
    }

    const rawCost =
      (input.cachedPromptTokens * this.costRates.cacheHitInputPerMillionUsd +
        input.cacheMissPromptTokens *
          this.costRates.cacheMissInputPerMillionUsd +
        input.completionTokens * this.costRates.outputPerMillionUsd) /
      ONE_MILLION;

    return Number(rawCost.toFixed(COST_PRECISION));
  }

  // ─── JSON 解析 ───────────────────────────────────────────

  private parseOutput(raw: string): AiProviderOutput {
    // JSON Mode 下模型保证输出合法 JSON，无需处理 markdown 包裹
    // 但仍然保留兼容处理
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
      return {
        result: raw,
        confidence: 0.5,
        citations: [],
      };
    }
  }

  // ─── API Key 校验 ───────────────────────────────────────

  private validateApiKey(): void {
    if (!this.apiKey) {
      throw new Error(
        'DEEPSEEK_API_KEY is required when AI_PROVIDER is set to "deepseek"',
      );
    }
  }
}

function resolveCostRates(model: string): CostRates | null {
  const defaultRates = DEEPSEEK_MODEL_COST_RATES[model];
  const rates: Partial<CostRates> = {
    cacheHitInputPerMillionUsd:
      parseEnvRate('AI_COST_CACHE_HIT_INPUT_PER_MILLION_USD') ??
      defaultRates?.cacheHitInputPerMillionUsd,
    cacheMissInputPerMillionUsd:
      parseEnvRate('AI_COST_CACHE_MISS_INPUT_PER_MILLION_USD') ??
      defaultRates?.cacheMissInputPerMillionUsd,
    outputPerMillionUsd:
      parseEnvRate('AI_COST_OUTPUT_PER_MILLION_USD') ??
      defaultRates?.outputPerMillionUsd,
  };

  if (
    rates.cacheHitInputPerMillionUsd === undefined ||
    rates.cacheMissInputPerMillionUsd === undefined ||
    rates.outputPerMillionUsd === undefined
  ) {
    return null;
  }

  return rates as CostRates;
}

function parseEnvRate(name: string): number | undefined {
  const raw = process.env[name];

  if (!raw) {
    return undefined;
  }

  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function normalizeTokenCount(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.floor(value);
}
