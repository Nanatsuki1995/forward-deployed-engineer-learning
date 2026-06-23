import { SetMetadata } from '@nestjs/common';

export const FIELD_PERMISSIONS_KEY = 'field-permissions:resource';

export function FieldPermissions(resource: string) {
  return SetMetadata(FIELD_PERMISSIONS_KEY, resource);
}
