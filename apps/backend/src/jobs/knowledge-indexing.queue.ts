import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue, type JobsOptions } from 'bullmq';
import { createBullmqConnectionOptions } from './bullmq-connection';

export const KNOWLEDGE_INDEXING_QUEUE = 'knowledge-indexing';

export interface KnowledgeIndexingJobData {
  documentId: string;
}

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1_000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 200 },
};

@Injectable()
export class KnowledgeIndexingQueue implements OnModuleDestroy {
  private readonly logger = new Logger(KnowledgeIndexingQueue.name);
  private queue?: Queue<KnowledgeIndexingJobData, unknown, 'index-document'>;

  async enqueueDocumentIndex(documentId: string): Promise<boolean> {
    const queue = this.getQueue();

    if (!queue) {
      return false;
    }

    try {
      await queue.add('index-document', { documentId }, DEFAULT_JOB_OPTIONS);
      return true;
    } catch (error) {
      this.logger.warn(
        `Failed to enqueue knowledge indexing job: ${getErrorMessage(error)}`,
      );
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close();
  }

  private getQueue(): Queue<
    KnowledgeIndexingJobData,
    unknown,
    'index-document'
  > | null {
    if (this.queue) {
      return this.queue;
    }

    const connection = createBullmqConnectionOptions();

    if (!connection) {
      return null;
    }

    this.queue = new Queue<KnowledgeIndexingJobData, unknown, 'index-document'>(
      KNOWLEDGE_INDEXING_QUEUE,
      { connection },
    );

    return this.queue ?? null;
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}
