import type { TicketPriority, TicketStatus, UserRole } from '../api/client';

export const statusLabels: Record<TicketStatus, string> = {
  new: '新建',
  triage: '分诊',
  in_progress: '处理中',
  pending_approval: '待审核',
  resolved: '已解决',
};

export const priorityLabels: Record<TicketPriority, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
};

export const roleLabels: Record<UserRole, string> = {
  admin: '管理员',
  agent: '现场工程师',
  reviewer: '业务审核人',
};

export const ticketStatuses: TicketStatus[] = [
  'new',
  'triage',
  'in_progress',
  'pending_approval',
  'resolved',
];

export const demoAccounts: Array<{
  label: string;
  email: string;
  role: UserRole;
}> = [
  { label: '管理员', email: 'admin@example.com', role: 'admin' },
  { label: '现场工程师', email: 'agent@example.com', role: 'agent' },
  { label: '审核人', email: 'reviewer@example.com', role: 'reviewer' },
];

export interface RolePermissions {
  canCreateTicket: boolean;
  canGenerateAi: boolean;
  canManageKnowledge: boolean;
  canReviewApproval: boolean;
  canUpdateTicketStatus: boolean;
  canViewAuditLogs: boolean;
  canViewAiCostDashboard: boolean;
  capabilities: string[];
  knowledgeMode: string;
  summary: string;
}

export function getRolePermissions(role?: UserRole): RolePermissions {
  switch (role) {
    case 'admin':
      return {
        canCreateTicket: true,
        canGenerateAi: true,
        canManageKnowledge: true,
        canReviewApproval: true,
        canUpdateTicketStatus: true,
        canViewAuditLogs: true,
        canViewAiCostDashboard: true,
        capabilities: [
          '全部工单',
          '知识维护',
          'AI 操作',
          '成本监控',
          '审计日志',
        ],
        knowledgeMode: '可维护知识库',
        summary: '拥有完整控制面',
      };
    case 'agent':
      return {
        canCreateTicket: true,
        canGenerateAi: true,
        canManageKnowledge: true,
        canReviewApproval: false,
        canUpdateTicketStatus: true,
        canViewAuditLogs: false,
        canViewAiCostDashboard: true,
        capabilities: ['工单处理', '知识维护', 'AI 操作', '成本监控'],
        knowledgeMode: '可维护知识库',
        summary: '可处理和流转工单',
      };
    case 'reviewer':
      return {
        canCreateTicket: false,
        canGenerateAi: true,
        canManageKnowledge: false,
        canReviewApproval: true,
        canUpdateTicketStatus: true,
        canViewAuditLogs: false,
        canViewAiCostDashboard: false,
        capabilities: ['审核确认', 'AI 操作', '知识只读'],
        knowledgeMode: '只读知识库',
        summary: '聚焦审核与确认',
      };
    default:
      return {
        canCreateTicket: false,
        canGenerateAi: false,
        canManageKnowledge: false,
        canReviewApproval: false,
        canUpdateTicketStatus: false,
        canViewAuditLogs: false,
        canViewAiCostDashboard: false,
        capabilities: ['未授权'],
        knowledgeMode: '未授权',
        summary: '需要登录',
      };
  }
}

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function formatTokenCount(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value);
}

export function formatEstimatedCostUsd(value: number) {
  return `$${value.toFixed(6)}`;
}
