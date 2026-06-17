import { Module } from '@nestjs/common';
import { KnowledgeIndexingQueue } from './knowledge-indexing.queue';
import { KnowledgeIndexingService } from './knowledge-indexing.service';
import { KnowledgeIndexingWorker } from './knowledge-indexing.worker';

@Module({
  providers: [
    KnowledgeIndexingQueue,
    KnowledgeIndexingService,
    KnowledgeIndexingWorker,
  ],
  exports: [KnowledgeIndexingQueue, KnowledgeIndexingService],
})
export class JobsModule {}
