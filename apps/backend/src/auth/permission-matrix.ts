import type { UserRole } from '@prisma/client';

const FIELD_PERMISSIONS: Record<UserRole, { read: string[]; write: string[] }> =
  {
    ADMIN: {
      read: ['*'],
      write: ['*'],
    },
    AGENT: {
      read: ['*'],
      write: [
        'title',
        'description',
        'category',
        'priority',
        'tags',
        'status',
        'assignee',
      ],
    },
    REVIEWER: {
      read: [
        'title',
        'description',
        'category',
        'status',
        'priority',
        'createdAt',
        'updatedAt',
      ],
      write: ['status'],
    },
  };

export function getReadableFields(role: UserRole): string[] | 'all' {
  const perms = FIELD_PERMISSIONS[role];
  if (!perms) {
    return [];
  }
  if (perms.read.includes('*')) {
    return 'all';
  }
  return perms.read;
}

export function getWritableFields(role: UserRole): string[] {
  const perms = FIELD_PERMISSIONS[role];
  if (!perms) {
    return [];
  }
  if (perms.write.includes('*')) {
    return ['*'];
  }
  return perms.write;
}

export function canWriteField(role: UserRole, field: string): boolean {
  const writable = getWritableFields(role);
  if (writable.includes('*')) {
    return true;
  }
  return writable.includes(field);
}
