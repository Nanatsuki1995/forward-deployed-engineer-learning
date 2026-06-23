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

export interface AiProviderOutput {
  result: string;
  confidence: number;
  citations: string[];
}

export interface AiProvider {
  generateReplySuggestion(
    input: AiReplySuggestionInput,
  ): Promise<AiProviderOutput>;
  generateSummary(input: AiSummaryInput): Promise<AiProviderOutput>;
}
