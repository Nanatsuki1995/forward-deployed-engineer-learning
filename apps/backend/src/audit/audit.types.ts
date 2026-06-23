import type { AuditAction } from '@prisma/client';

export interface AuditEvent {
  actorId: string;
  actorName: string;
  actorRole: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  method: string;
  path: string;
  metadata?: Record<string, unknown>;
}
