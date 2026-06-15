import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorPayload {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: {
    timestamp: string;
    path: string;
    method: string;
    statusCode: number;
  };
}

interface NestErrorResponse {
  code?: string;
  error?: string;
  message?: string | string[];
  statusCode?: number;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = this.toPayload(exception, request, statusCode);

    response.status(statusCode).json(payload);
  }

  private toPayload(
    exception: unknown,
    request: Request,
    statusCode: number,
  ): ErrorPayload {
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const normalizedResponse =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as NestErrorResponse)
        : undefined;
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (this.normalizeMessage(normalizedResponse?.message) ??
          (statusCode === Number(HttpStatus.INTERNAL_SERVER_ERROR)
            ? 'Internal server error'
            : 'Request failed'));
    const details =
      Array.isArray(normalizedResponse?.message) &&
      normalizedResponse.message.length > 0
        ? normalizedResponse.message
        : undefined;

    return {
      error: {
        code: this.normalizeCode(
          normalizedResponse?.code ?? normalizedResponse?.error,
          statusCode,
        ),
        message,
        ...(details ? { details } : {}),
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        statusCode,
      },
    };
  }

  private normalizeMessage(message?: string | string[]): string | undefined {
    if (Array.isArray(message)) {
      return message[0];
    }

    return message;
  }

  private normalizeCode(error: string | undefined, statusCode: number): string {
    if (error) {
      return error
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/\s+/g, '_')
        .toUpperCase();
    }

    return `HTTP_${statusCode}`;
  }
}
