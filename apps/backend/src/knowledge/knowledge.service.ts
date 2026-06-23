import { BadRequestException, Injectable } from '@nestjs/common';
import { KnowledgeStatus, type KnowledgeDocument } from '@prisma/client';
import { mapKnowledgeDocument } from '../data/workbench.mapper';
import { EmbeddingService } from '../embedding/embedding.service';
import {
  KNOWLEDGE_DOCUMENTS_CACHE_KEY,
  KNOWLEDGE_DOCUMENTS_CACHE_TTL_SECONDS,
  KnowledgeIndexingService,
} from '../jobs/knowledge-indexing.service';
import { KnowledgeIndexingQueue } from '../jobs/knowledge-indexing.queue';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '../redis/redis-cache.service';
import type { CreateKnowledgeDocumentDto } from './dto/create-knowledge-document.dto';
import type { UploadKnowledgeDocumentDto } from './dto/upload-knowledge-document.dto';

const SUPPORTED_MARKDOWN_MIME_TYPES = new Set([
  'text/markdown',
  'text/plain',
  'application/octet-stream',
]);

export interface UploadedKnowledgeFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class KnowledgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
    private readonly indexingQueue: KnowledgeIndexingQueue,
    private readonly indexer: KnowledgeIndexingService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async findAll() {
    return this.cache.getOrSet(
      KNOWLEDGE_DOCUMENTS_CACHE_KEY,
      KNOWLEDGE_DOCUMENTS_CACHE_TTL_SECONDS,
      async () => {
        const documents = await this.prisma.knowledgeDocument.findMany({
          orderBy: { createdAt: 'desc' },
        });

        return documents.map(mapKnowledgeDocument);
      },
    );
  }

  async search(query: string, limit = 5) {
    const queryEmbedding = await this.embeddingService.embedSingle(query);

    const chunks = await this.prisma.knowledgeChunk.findMany({
      include: {
        document: true,
      },
      where: {
        document: {
          status: KnowledgeStatus.INDEXED,
        },
      },
    });

    const scored = chunks
      .map((chunk) => ({
        chunk: {
          id: chunk.id,
          position: chunk.position,
          content: chunk.content,
          startOffset: chunk.startOffset,
          endOffset: chunk.endOffset,
        },
        document: mapKnowledgeDocument(chunk.document),
        score: cosineSimilarity(queryEmbedding, chunk.embedding),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored;
  }

  async create(input: CreateKnowledgeDocumentDto) {
    const title = input.title.trim();
    const source = input.source?.trim() || 'manual-entry';
    const content = input.content ?? '';

    const document = await this.prisma.knowledgeDocument.create({
      data: {
        title,
        source,
        content,
        status: KnowledgeStatus.PROCESSING,
        chunks: 0,
        citations: ['后台索引中'],
      },
    });

    const indexedDocument = await this.scheduleIndexing(document);

    return mapKnowledgeDocument(indexedDocument);
  }

  async upload(
    input: UploadKnowledgeDocumentDto,
    file?: UploadedKnowledgeFile,
  ) {
    if (!file) {
      throw new BadRequestException({
        code: 'KNOWLEDGE_FILE_REQUIRED',
        message: 'file is required',
      });
    }

    this.assertSupportedMarkdownFile(file);

    const source = input.source?.trim() || file.originalname;
    const title =
      input.title?.trim() || deriveTitleFromFileName(file.originalname);
    const content = file.buffer.toString('utf8').replace(/^\uFEFF/, '');

    if (!content.trim()) {
      throw new BadRequestException({
        code: 'KNOWLEDGE_FILE_EMPTY',
        message: 'file content is empty',
      });
    }

    const document = await this.prisma.knowledgeDocument.create({
      data: {
        title,
        source,
        content,
        status: KnowledgeStatus.PROCESSING,
        chunks: 0,
        citations: ['后台索引中'],
      },
    });

    const indexedDocument = await this.scheduleIndexing(document);

    return mapKnowledgeDocument(indexedDocument);
  }

  private async scheduleIndexing(
    document: KnowledgeDocument,
  ): Promise<KnowledgeDocument> {
    await this.cache.delete(KNOWLEDGE_DOCUMENTS_CACHE_KEY);

    const queued = await this.indexingQueue.enqueueDocumentIndex(document.id);

    if (queued) {
      return document;
    }

    return this.indexer.indexDocument(document.id);
  }

  private assertSupportedMarkdownFile(file: UploadedKnowledgeFile) {
    const extension = file.originalname.split('.').pop()?.toLowerCase() ?? '';
    const hasSupportedExtension = ['md', 'markdown', 'txt'].includes(extension);
    const hasSupportedMimeType = SUPPORTED_MARKDOWN_MIME_TYPES.has(
      file.mimetype,
    );

    if (!hasSupportedExtension || !hasSupportedMimeType) {
      throw new BadRequestException({
        code: 'UNSUPPORTED_KNOWLEDGE_FILE',
        message: 'Only .md, .markdown and .txt files are supported',
      });
    }
  }
}

function deriveTitleFromFileName(fileName: string): string {
  const withoutPath = fileName.split(/[\\/]/).pop() || 'uploaded-document';
  const title = withoutPath.replace(/\.(md|markdown|txt)$/i, '').trim();

  return title || 'uploaded-document';
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) {
    return 0;
  }

  const dims = Math.min(a.length, b.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < dims; i += 1) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) {
    return 0;
  }

  return Number((dotProduct / magnitude).toFixed(6));
}
