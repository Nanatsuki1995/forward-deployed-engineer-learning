import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

@Injectable()
export class SseJwtGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext): Request {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();

    // If no Authorization header, try query parameter (for SSE/EventSource)
    if (!request.headers.authorization) {
      const token = request.query.authorization as string | undefined;
      if (token) {
        request.headers.authorization = token.startsWith('Bearer ')
          ? token
          : `Bearer ${token}`;
      }
    }

    return request;
  }
}
