import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { KnowledgeStatus, type KnowledgeDocument } from '@prisma/client';
import { parseMarkdownKnowledge } from '../knowledge/knowledge-indexing';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '../redis/redis-cache.service';

export const KNOWLEDGE_DOCUMENTS_CACHE_KEY = 'knowledge:documents:list:v1';
export const KNOWLEDGE_DOCUMENTS_CACHE_TTL_SECONDS = 30;

@Injectable()
export class KnowledgeIndexingService {
  private readonly logger = new Logger(KnowledgeIndexingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
  ) {}

  async indexDocument(documentId: string): Promise<KnowledgeDocument> {
    const document = await this.prisma.knowledgeDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Knowledge document ${documentId} not found`);
    }

    const parsed = parseMarkdownKnowledge(document.content);

    try {
      const updatedDocument = await this.prisma.$transaction(async (prisma) => {
        await prisma.knowledgeChunk.deleteMany({ where: { documentId } });

        return prisma.knowledgeDocument.update({
          where: { id: documentId },
          data: {
            content: parsed.content,
            status: KnowledgeStatus.INDEXED,
            chunks: parsed.chunks.length,
            citations: parsed.citations,
            chunkRecords: {
              create: parsed.chunks,
            },
          },
        });
      });

      await this.cache.delete(KNOWLEDGE_DOCUMENTS_CACHE_KEY);

      return updatedDocument;
    } catch (error) {
      this.logger.warn(
        `Knowledge document ${documentId} indexing failed: ${getErrorMessage(error)}`,
      );
      await this.prisma.knowledgeDocument.update({
        where: { id: documentId },
        data: { status: KnowledgeStatus.FAILED },
      });
      await this.cache.delete(KNOWLEDGE_DOCUMENTS_CACHE_KEY);
      throw error;
    }
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}
