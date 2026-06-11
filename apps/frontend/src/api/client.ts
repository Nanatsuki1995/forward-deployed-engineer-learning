const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
const TOKEN_STORAGE_KEY = 'fde-learning-access-token';

let accessToken =
  typeof window === 'undefined'
    ? ''
    : window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';

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
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  source: string;
  content: string;
  status: 'processing' | 'indexed' | 'failed';
  chunks: number;
  citations: string[];
  createdAt: string;
}

export interface AiLog {
  id: string;
  ticketId: string;
  type: 'reply_suggestion' | 'summary';
  promptVersion: string;
  model: string;
  result: string;
  confidence: number;
  citations: string[];
  createdAt: string;
}

export interface HealthResponse {
  status: 'ok';
  service: string;
  version: string;
  uptime: number;
  timestamp: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export const api = {
  health: () => request<HealthResponse>('/health'),
  login: async (body: { email: string; password: string }) => {
    const response = await request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
      skipAuth: true,
    });
    setAccessToken(response.accessToken);
    return response;
  },
  me: () => request<User>('/auth/me'),
  tickets: () => request<Ticket[]>('/tickets'),
  knowledge: () => request<KnowledgeDocument[]>('/knowledge'),
  aiLogs: () => request<AiLog[]>('/ai/logs'),
  createReplySuggestion: (ticketId: string) =>
    request<AiLog>(`/ai/tickets/${ticketId}/reply-suggestion`, {
      method: 'POST',
    }),
  createSummary: (ticketId: string) =>
    request<AiLog>(`/ai/tickets/${ticketId}/summary`, {
      method: 'POST',
    }),
};

async function request<T>(
  path: string,
  init: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> {
  const { skipAuth, ...requestInit } = init;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestInit,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken && !skipAuth
        ? { Authorization: `Bearer ${accessToken}` }
        : {}),
      ...requestInit.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function setAccessToken(token: string) {
  accessToken = token;

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
}
