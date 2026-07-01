export type UserRole = 'admin' | 'agent' | 'reviewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export type TicketStatus =
  | 'new'
  | 'triage'
  | 'in_progress'
  | 'pending_approval'
  | 'resolved';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TicketMessage {
  id: string;
  author: string;
  role: 'requester' | 'agent' | 'system';
  content: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: string;
  status: TicketStatus;
  priority: TicketPriority;
  requester: string;
  assignee: string;
  tags: string[];
  submitterName?: string;
  submitterPhone?: string;
  submitterEmail?: string;
  source: 'internal' | 'public';
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

export type KnowledgeStatus = 'processing' | 'indexed' | 'failed';

export interface KnowledgeDocument {
  id: string;
  title: string;
  source: string;
  content: string;
  status: KnowledgeStatus;
  chunks: number;
  citations: string[];
  createdAt: string;
}

export type AiLogType = 'reply_suggestion' | 'summary';

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

export type NotificationTypeDto = 'new_ticket';

export interface Notification {
  id: string;
  userId: string;
  ticketId: string;
  type: NotificationTypeDto;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface AiLog {
  id: string;
  ticketId: string;
  type: AiLogType;
  promptVersion: string;
  model: string;
  result: string;
  confidence: number;
  citations: string[];
  usage?: AiTokenUsage;
  createdAt: string;
}
