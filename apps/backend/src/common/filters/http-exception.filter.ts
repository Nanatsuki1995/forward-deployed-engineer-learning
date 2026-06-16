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

interface MulterErrorLike {
  code?: string;
  message?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const statusCode = this.getStatusCode(exception);
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
    const multerError = this.isMulterError(exception) ? exception : undefined;
    const normalizedResponse =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as NestErrorResponse)
        : undefined;
    const message =
      multerError?.message ??
      (typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (this.normalizeMessage(normalizedResponse?.message) ??
          (statusCode === Number(HttpStatus.INTERNAL_SERVER_ERROR)
            ? 'Internal server error'
            : 'Request failed')));
    const details =
      Array.isArray(normalizedResponse?.message) &&
      normalizedResponse.message.length > 0
        ? normalizedResponse.message
        : undefined;

    return {
      error: {
        code: this.normalizeCode(
          multerError?.code ??
            normalizedResponse?.code ??
            normalizedResponse?.error,
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

  private isMulterError(exception: unknown): exception is MulterErrorLike {
    const code = (exception as MulterErrorLike | null)?.code;

    return (
      typeof exception === 'object' &&
      exception !== null &&
      'code' in exception &&
      typeof code === 'string' &&
      code.startsWith('LIMIT_')
    );
  }

  private getStatusCode(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    if (this.isMulterError(exception)) {
      return exception.code === 'LIMIT_FILE_SIZE'
        ? HttpStatus.PAYLOAD_TOO_LARGE
        : HttpStatus.BAD_REQUEST;
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
