const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
const ACCESS_TOKEN_STORAGE_KEY = 'fde-learning-access-token';
const REFRESH_TOKEN_STORAGE_KEY = 'fde-learning-refresh-token';

let accessToken =
  typeof window === 'undefined'
    ? ''
    : window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) || '';
let refreshToken =
  typeof window === 'undefined'
    ? ''
    : window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) || '';
let refreshSessionPromise: Promise<AuthResponse> | null = null;

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

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface LogoutResponse {
  success: true;
}

export const api = {
  health: () => request<HealthResponse>('/health'),
  login: async (body: { email: string; password: string }) => {
    const response = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
      skipAuth: true,
    });
    setAuthTokens(response);
    return response;
  },
  refreshSession: async () => refreshSession(),
  logout: async () => {
    const token = refreshToken;

    try {
      if (token) {
        await request<LogoutResponse>('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: token }),
          skipAuth: true,
          skipRefresh: true,
        });
      }
    } finally {
      clearAuthTokens();
    }
  },
  me: () => request<User>('/auth/me'),
  tickets: () => request<Ticket[]>('/tickets'),
  updateTicketStatus: (ticketId: string, status: TicketStatus) =>
    request<Ticket>(`/tickets/${ticketId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  knowledge: () => request<KnowledgeDocument[]>('/knowledge'),
  uploadKnowledgeDocument: (input: {
    file: File;
    source?: string;
    title?: string;
  }) => {
    const formData = new FormData();

    formData.append('file', input.file);

    if (input.title?.trim()) {
      formData.append('title', input.title.trim());
    }

    if (input.source?.trim()) {
      formData.append('source', input.source.trim());
    }

    return request<KnowledgeDocument>('/knowledge/upload', {
      method: 'POST',
      body: formData,
    });
  },
  aiLogs: () => request<AiLog[]>('/ai/logs'),
  createReplySuggestion: (ticketId: string) =>
    request<AiLog>(`/ai/tickets/${ticketId}/reply-suggestion`, {
      method: 'POST',
    }),
  createSummary: (ticketId: string) =>
    request<AiLog>(`/ai/tickets/${ticketId}/summary`, {
      method: 'POST',
    }),
  hasStoredSession: () => Boolean(accessToken || refreshToken),
  clearSession: () => clearAuthTokens(),
};

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  skipRefresh?: boolean;
}

async function request<T>(
  path: string,
  init: RequestOptions = {},
): Promise<T> {
  const { skipAuth, skipRefresh, ...requestInit } = init;
  const headers = new Headers(requestInit.headers);
  const hasFormDataBody = isFormDataBody(requestInit.body);

  if (!headers.has('Content-Type') && !hasFormDataBody) {
    headers.set('Content-Type', 'application/json');
  }

  if (accessToken && !skipAuth) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestInit,
    headers,
  });

  if (response.status === 401 && !skipAuth && !skipRefresh && refreshToken) {
    await refreshSession();

    return request<T>(path, {
      ...init,
      skipRefresh: true,
    });
  }

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message || `Request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function refreshSession(): Promise<AuthResponse> {
  if (!refreshToken) {
    throw new Error('登录已过期，请重新登录');
  }

  if (!refreshSessionPromise) {
    refreshSessionPromise = request<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
      skipAuth: true,
      skipRefresh: true,
    })
      .then((response) => {
        setAuthTokens(response);
        return response;
      })
      .catch((error: unknown) => {
        clearAuthTokens();
        throw error;
      })
      .finally(() => {
        refreshSessionPromise = null;
      });
  }

  return refreshSessionPromise;
}

function setAuthTokens(response: AuthResponse) {
  accessToken = response.accessToken;
  refreshToken = response.refreshToken;

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, response.accessToken);
    window.localStorage.setItem(
      REFRESH_TOKEN_STORAGE_KEY,
      response.refreshToken,
    );
  }
}

function clearAuthTokens() {
  accessToken = '';
  refreshToken = '';

  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  const text = await response.text();

  if (!text) {
    return '';
  }

  try {
    const payload = JSON.parse(text) as {
      message?: string | string[];
      error?:
        | string
        | {
        message?: string;
        details?: string[];
      };
    };

    if (typeof payload.error === 'object' && payload.error !== null) {
      return [payload.error.message, ...(payload.error.details ?? [])]
        .filter(Boolean)
        .join(', ');
    }

    if (Array.isArray(payload.message)) {
      return payload.message.join(', ');
    }

    return payload.message ?? (typeof payload.error === 'string' ? payload.error : text);
  } catch {
    return text;
  }
}

function isFormDataBody(body: BodyInit | null | undefined): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}
