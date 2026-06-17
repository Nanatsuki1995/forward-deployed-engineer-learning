import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Worker, type Job } from 'bullmq';
import {
  KNOWLEDGE_INDEXING_QUEUE,
  type KnowledgeIndexingJobData,
} from './knowledge-indexing.queue';
import { KnowledgeIndexingService } from './knowledge-indexing.service';
import { createBullmqConnectionOptions } from './bullmq-connection';

@Injectable()
export class KnowledgeIndexingWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KnowledgeIndexingWorker.name);
  private worker?: Worker<KnowledgeIndexingJobData, unknown, 'index-document'>;

  constructor(private readonly indexer: KnowledgeIndexingService) {}

  onModuleInit(): void {
    const connection = createBullmqConnectionOptions();

    if (!connection) {
      return;
    }

    this.worker = new Worker<
      KnowledgeIndexingJobData,
      unknown,
      'index-document'
    >(
      KNOWLEDGE_INDEXING_QUEUE,
      (job: Job<KnowledgeIndexingJobData>) =>
        this.indexer.indexDocument(job.data.documentId),
      { connection, concurrency: getWorkerConcurrency() },
    );

    this.worker.on('failed', (job, error) => {
      this.logger.warn(
        `Knowledge indexing job ${job?.id ?? 'unknown'} failed: ${error.message}`,
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}

function getWorkerConcurrency(): number {
  const concurrency = Number(process.env.KNOWLEDGE_INDEXING_CONCURRENCY);

  return Number.isFinite(concurrency) && concurrency > 0 ? concurrency : 2;
}
