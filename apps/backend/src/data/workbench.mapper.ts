import {
  AiLogType,
  KnowledgeStatus,
  MessageRole,
  TicketPriority,
  TicketStatus,
  UserRole,
  type AiLog,
  type KnowledgeDocument,
  type Notification,
  type Ticket,
  type TicketMessage,
  type User,
} from '@prisma/client';
import type {
  AiLog as AiLogDto,
  Notification as NotificationDto,
  KnowledgeDocument as KnowledgeDocumentDto,
  Ticket as TicketDto,
  TicketMessage as TicketMessageDto,
  User as UserDto,
} from './workbench.types';

export function mapUser(user: User): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: mapUserRole(user.role),
  };
}

export function mapTicket(
  ticket: Ticket & { messages?: TicketMessage[] },
): TicketDto {
  return {
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    category: ticket.category,
    status: mapTicketStatus(ticket.status),
    priority: mapTicketPriority(ticket.priority),
    requester: ticket.requester,
    assignee: ticket.assignee,
    tags: ticket.tags,
    submitterName: ticket.submitterName ?? undefined,
    submitterPhone: ticket.submitterPhone ?? undefined,
    submitterEmail: ticket.submitterEmail ?? undefined,
    source: ticket.source === 'public' ? 'public' : 'internal',
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    messages: (ticket.messages ?? []).map(mapTicketMessage),
  };
}

export function mapTicketMessage(message: TicketMessage): TicketMessageDto {
  return {
    id: message.id,
    author: message.author,
    role: mapMessageRole(message.role),
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  };
}

export function mapKnowledgeDocument(
  document: KnowledgeDocument,
): KnowledgeDocumentDto {
  return {
    id: document.id,
    title: document.title,
    source: document.source,
    content: document.content,
    status: mapKnowledgeStatus(document.status),
    chunks: document.chunks,
    citations: document.citations,
    createdAt: document.createdAt.toISOString(),
  };
}

export function mapAiLog(
  log: AiLog,
  options: { includeUsage?: boolean } = {},
): AiLogDto {
  const dto: AiLogDto = {
    id: log.id,
    ticketId: log.ticketId,
    type: mapAiLogType(log.type),
    promptVersion: log.promptVersion,
    model: log.model,
    result: log.result,
    confidence: log.confidence,
    citations: log.citations,
    createdAt: log.createdAt.toISOString(),
  };

  if (options.includeUsage) {
    dto.usage = {
      promptTokens: log.promptTokens,
      completionTokens: log.completionTokens,
      totalTokens: log.totalTokens,
      cachedPromptTokens: log.cachedPromptTokens,
      cacheMissPromptTokens: log.cacheMissPromptTokens,
      reasoningTokens: log.reasoningTokens,
      apiCallCount: log.apiCallCount,
      estimatedCostUsd: log.estimatedCostUsd,
    };
  }

  return dto;
}

export function toPrismaUserRole(role: string | undefined): UserRole {
  switch (role) {
    case 'admin':
      return UserRole.ADMIN;
    case 'reviewer':
      return UserRole.REVIEWER;
    default:
      return UserRole.AGENT;
  }
}

export function toPrismaTicketStatus(status: string): TicketStatus {
  switch (status) {
    case 'new':
      return TicketStatus.NEW;
    case 'triage':
      return TicketStatus.TRIAGE;
    case 'in_progress':
      return TicketStatus.IN_PROGRESS;
    case 'pending_approval':
      return TicketStatus.PENDING_APPROVAL;
    case 'resolved':
      return TicketStatus.RESOLVED;
    default:
      return TicketStatus.NEW;
  }
}

export function toPrismaTicketPriority(
  priority: string | undefined,
): TicketPriority {
  switch (priority) {
    case 'low':
      return TicketPriority.LOW;
    case 'high':
      return TicketPriority.HIGH;
    case 'urgent':
      return TicketPriority.URGENT;
    default:
      return TicketPriority.MEDIUM;
  }
}

function mapUserRole(role: UserRole) {
  switch (role) {
    case UserRole.ADMIN:
      return 'admin';
    case UserRole.REVIEWER:
      return 'reviewer';
    case UserRole.AGENT:
      return 'agent';
  }
}

function mapTicketStatus(status: TicketStatus) {
  switch (status) {
    case TicketStatus.NEW:
      return 'new';
    case TicketStatus.TRIAGE:
      return 'triage';
    case TicketStatus.IN_PROGRESS:
      return 'in_progress';
    case TicketStatus.PENDING_APPROVAL:
      return 'pending_approval';
    case TicketStatus.RESOLVED:
      return 'resolved';
  }
}

function mapTicketPriority(priority: TicketPriority) {
  switch (priority) {
    case TicketPriority.LOW:
      return 'low';
    case TicketPriority.MEDIUM:
      return 'medium';
    case TicketPriority.HIGH:
      return 'high';
    case TicketPriority.URGENT:
      return 'urgent';
  }
}

function mapMessageRole(role: MessageRole) {
  switch (role) {
    case MessageRole.REQUESTER:
      return 'requester';
    case MessageRole.AGENT:
      return 'agent';
    case MessageRole.SYSTEM:
      return 'system';
  }
}

function mapKnowledgeStatus(status: KnowledgeStatus) {
  switch (status) {
    case KnowledgeStatus.PROCESSING:
      return 'processing';
    case KnowledgeStatus.INDEXED:
      return 'indexed';
    case KnowledgeStatus.FAILED:
      return 'failed';
  }
}

function mapAiLogType(type: AiLogType) {
  switch (type) {
    case AiLogType.REPLY_SUGGESTION:
      return 'reply_suggestion';
    case AiLogType.SUMMARY:
      return 'summary';
  }
}

export function mapNotification(
  notification: Notification & { ticket?: { id: string } },
): NotificationDto {
  return {
    id: notification.id,
    userId: notification.userId,
    ticketId: notification.ticketId,
    type: 'new_ticket',
    title: notification.title,
    message: notification.message,
    isRead: notification.isRead,
    createdAt: notification.createdAt.toISOString(),
  };
}
