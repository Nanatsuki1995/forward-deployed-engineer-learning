import { SetMetadata } from '@nestjs/common';
import type { AuditAction } from '@prisma/client';

export const AUDIT_RESOURCE_KEY = 'audit:resource';
export const AUDIT_ACTION_KEY = 'audit:action';

export function Auditable(resource: string, action?: AuditAction) {
  return (
    target: object,
    key?: string | symbol,
    descriptor?: PropertyDescriptor,
  ) => {
    SetMetadata(AUDIT_RESOURCE_KEY, resource)(target, key!, descriptor!);
    if (action) {
      SetMetadata(AUDIT_ACTION_KEY, action)(target, key!, descriptor!);
    }
  };
}
