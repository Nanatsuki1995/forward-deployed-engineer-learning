export interface AiReplySuggestionInput {
  ticketTitle: string;
  ticketDescription: string;
  ticketCategory: string;
  ticketPriority: string;
  requester: string;
  assignee: string;
  knowledgeContext?: string;
}

export interface AiSummaryInput {
  ticketTitle: string;
  ticketDescription: string;
  ticketStatus: string;
  ticketPriority: string;
  assignee: string;
  ticketTags: string[];
}

export interface AiTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cachedPromptTokens: number;
  cacheMissPromptTokens: number;
  reasoningTokens: number;
  apiCallCount: number;
  estimatedCostUsd: number | null;
}

export interface AiProviderOutput {
  result: string;
  confidence: number;
  citations: string[];
  usage?: AiTokenUsage;
}

export interface AiProvider {
  generateReplySuggestion(
    input: AiReplySuggestionInput,
  ): Promise<AiProviderOutput>;
  generateSummary(input: AiSummaryInput): Promise<AiProviderOutput>;
}

export class AiProviderCallError extends Error {
  constructor(
    message: string,
    readonly usage?: AiTokenUsage,
  ) {
    super(message);
    this.name = 'AiProviderCallError';
  }
}
