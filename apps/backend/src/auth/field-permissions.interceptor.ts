import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { FIELD_PERMISSIONS_KEY } from './field-permissions.decorator';
import { getReadableFields } from './permission-matrix';

@Injectable()
export class FieldPermissionsInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const resource = this.reflector.get<string>(
      FIELD_PERMISSIONS_KEY,
      context.getHandler(),
    );

    if (!resource) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{
      user?: { id: string; role: string };
      method: string;
    }>();
    const user = request.user;

    if (!user) {
      return next.handle();
    }

    const readableFields = getReadableFields(
      user.role as 'ADMIN' | 'AGENT' | 'REVIEWER',
    );

    // If user can read all fields, no filtering needed
    if (readableFields === 'all') {
      return next.handle();
    }

    // Only filter GET responses
    if (request.method !== 'GET') {
      return next.handle();
    }

    return next
      .handle()
      .pipe(map((data) => this.filterFields(data, readableFields)));
  }

  private filterFields(data: unknown, allowedFields: string[]): unknown {
    if (Array.isArray(data)) {
      return data.map((item) => this.filterFields(item, allowedFields));
    }

    if (data && typeof data === 'object' && !(data instanceof Date)) {
      const filtered: Record<string, unknown> = {};
      for (const key of Object.keys(data)) {
        if (allowedFields.includes(key)) {
          filtered[key] = (data as Record<string, unknown>)[key];
        }
      }
      return filtered;
    }

    return data;
  }
}
