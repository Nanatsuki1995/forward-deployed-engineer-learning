import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuditAction } from '@prisma/client';
import { Observable, tap } from 'rxjs';
import { AUDIT_RESOURCE_KEY, AUDIT_ACTION_KEY } from './audit.decorator';
import { AuditService } from './audit.service';

function actionFromMethod(method: string): AuditAction {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'VIEW';
    case 'POST':
      return 'CREATE';
    case 'PATCH':
    case 'PUT':
      return 'UPDATE';
    case 'DELETE':
      return 'DELETE';
    default:
      return 'VIEW';
  }
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const resource = this.reflector.get<string>(
      AUDIT_RESOURCE_KEY,
      context.getHandler(),
    );

    if (!resource) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{
      user?: { id: string; name: string; role: string };
      method: string;
      path: string;
      params: Record<string, string>;
    }>();
    const user = request.user;

    if (!user) {
      return next.handle();
    }

    const explicitAction = this.reflector.get<AuditAction>(
      AUDIT_ACTION_KEY,
      context.getHandler(),
    );
    const action = explicitAction ?? actionFromMethod(request.method);

    return next.handle().pipe(
      tap(() => {
        this.auditService.log({
          actorId: user.id,
          actorName: user.name,
          actorRole: user.role,
          action,
          resource,
          resourceId: request.params?.id ?? request.params?.ticketId,
          method: request.method,
          path: request.path,
        });
      }),
    );
  }
}
