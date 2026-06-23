import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuditEvent } from './audit.types';

const FLUSH_INTERVAL_MS = 5000;
const MAX_BATCH_SIZE = 50;

@Injectable()
export class AuditService implements OnModuleDestroy {
  private readonly logger = new Logger(AuditService.name);
  private readonly buffer: AuditEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly prisma: PrismaService) {
    this.startFlushTimer();
  }

  log(event: AuditEvent): void {
    if (process.env.AUDIT_LOG_ENABLED === 'false') {
      return;
    }

    this.buffer.push({
      ...event,
      metadata: event.metadata ?? {},
    });

    if (this.buffer.length >= MAX_BATCH_SIZE) {
      void this.flushNow();
    }
  }

  onModuleDestroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    void this.flushNow();
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      void this.flushNow();
    }, FLUSH_INTERVAL_MS);
  }

  private async flushNow(): Promise<void> {
    if (this.buffer.length === 0) return;

    const batch = this.buffer.splice(0);
    try {
      await this.prisma.auditLog.createMany({
        data: batch.map((event) => ({
          actorId: event.actorId,
          actorName: event.actorName,
          actorRole: event.actorRole,
          action: event.action,
          resource: event.resource,
          resourceId: event.resourceId ?? null,
          method: event.method,
          path: event.path,
          metadata: (event.metadata as Prisma.InputJsonValue) ?? {},
        })),
      });
    } catch (error) {
      this.logger.warn(
        `Failed to flush ${batch.length} audit events: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
