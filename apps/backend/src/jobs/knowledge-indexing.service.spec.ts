import { NotFoundException } from '@nestjs/common';
import { KnowledgeStatus } from '@prisma/client';
import { EmbeddingService } from '../embedding/embedding.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '../redis/redis-cache.service';
import type { KnowledgeChunkInput } from '../knowledge/knowledge-indexing';
import {
  KNOWLEDGE_DOCUMENTS_CACHE_KEY,
  KnowledgeIndexingService,
} from './knowledge-indexing.service';

const storedDocument = {
  id: 'doc-1',
  title: '规则手册',
  source: 'rules.md',
  content: '# 规则\n\n第一段',
  status: KnowledgeStatus.PROCESSING,
  chunks: 0,
  citations: ['后台索引中'],
  createdAt: new Date('2026-06-16T00:00:00.000Z'),
  updatedAt: new Date('2026-06-16T00:00:00.000Z'),
};

type StoredKnowledgeDocument = typeof storedDocument;

type KnowledgeDocumentUpdateArgs = {
  where: { id: string };
  data: {
    content?: string;
    status: KnowledgeStatus;
    chunks?: number;
    citations?: string[];
    chunkRecords?: { create: KnowledgeChunkInput[] };
  };
};

type DeleteKnowledgeChunksMock = (args: {
  where: { documentId: string };
}) => Promise<{ count: number }>;
type UpdateKnowledgeDocumentMock = (
  args: KnowledgeDocumentUpdateArgs,
) => Promise<StoredKnowledgeDocument>;
type TransactionClient = {
  knowledgeChunk: {
    deleteMany: jest.MockedFunction<DeleteKnowledgeChunksMock>;
  };
  knowledgeDocument: {
    update: jest.MockedFunction<UpdateKnowledgeDocumentMock>;
  };
};
type TransactionCallback = (
  client: TransactionClient,
) => Promise<StoredKnowledgeDocument>;
type TransactionMock = (
  callback: TransactionCallback,
) => Promise<StoredKnowledgeDocument>;
type FindUniqueKnowledgeDocumentMock = (args: {
  where: { id: string };
}) => Promise<StoredKnowledgeDocument | null>;

describe('KnowledgeIndexingService', () => {
  let transactionClient: TransactionClient;
  let prismaMock: {
    knowledgeDocument: {
      findUnique: jest.MockedFunction<FindUniqueKnowledgeDocumentMock>;
      update: jest.MockedFunction<UpdateKnowledgeDocumentMock>;
    };
    $transaction: jest.MockedFunction<TransactionMock>;
  };
  let cacheMock: { delete: jest.Mock };
  let embeddingMock: { embed: jest.Mock };
  let service: KnowledgeIndexingService;

  beforeEach(() => {
    transactionClient = {
      knowledgeChunk: {
        deleteMany: jest
          .fn<DeleteKnowledgeChunksMock>()
          .mockResolvedValue({ count: 0 }),
      },
      knowledgeDocument: {
        update: jest.fn<UpdateKnowledgeDocumentMock>().mockResolvedValue({
          ...storedDocument,
          content: '规则\n\n第一段',
          status: KnowledgeStatus.INDEXED,
          chunks: 1,
          citations: ['规则', '第一段'],
        }),
      },
    };
    const runTransaction: TransactionMock = (callback) =>
      callback(transactionClient);

    prismaMock = {
      knowledgeDocument: {
        findUnique: jest
          .fn<FindUniqueKnowledgeDocumentMock>()
          .mockResolvedValue(storedDocument),
        update: jest.fn<UpdateKnowledgeDocumentMock>().mockResolvedValue({
          ...storedDocument,
          status: KnowledgeStatus.FAILED,
        }),
      },
      $transaction: jest.fn<TransactionMock>(runTransaction),
    };
    cacheMock = {
      delete: jest.fn().mockResolvedValue(undefined),
    };
    embeddingMock = {
      embed: jest
        .fn()
        .mockResolvedValue([Array.from({ length: 16 }, () => 0.25)]),
    };
    service = new KnowledgeIndexingService(
      prismaMock as unknown as PrismaService,
      cacheMock as unknown as RedisCacheService,
      embeddingMock as unknown as EmbeddingService,
    );
  });

  it('rewrites chunks and marks the document as indexed', async () => {
    const document = await service.indexDocument('doc-1');

    expect(prismaMock.knowledgeDocument.findUnique).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
    });
    expect(transactionClient.knowledgeChunk.deleteMany).toHaveBeenCalledWith({
      where: { documentId: 'doc-1' },
    });
    const updateArgs =
      transactionClient.knowledgeDocument.update.mock.calls[0]?.[0];
    const firstChunk = updateArgs?.data.chunkRecords?.create[0];

    expect(updateArgs?.where).toEqual({ id: 'doc-1' });
    expect(updateArgs?.data.status).toBe(KnowledgeStatus.INDEXED);
    expect(updateArgs?.data.chunks).toBe(1);
    expect(updateArgs?.data.citations).toEqual(['规则', '第一段']);
    expect(firstChunk?.content).toBe('规则\n\n第一段');
    expect(firstChunk?.position).toBe(0);
    expect(firstChunk?.startOffset).toBe(0);
    expect(cacheMock.delete).toHaveBeenCalledWith(
      KNOWLEDGE_DOCUMENTS_CACHE_KEY,
    );
    expect(document.status).toBe(KnowledgeStatus.INDEXED);
  });

  it('marks documents as failed when indexing throws', async () => {
    transactionClient.knowledgeDocument.update.mockRejectedValue(
      new Error('database unavailable'),
    );

    await expect(service.indexDocument('doc-1')).rejects.toThrow(
      'database unavailable',
    );

    expect(prismaMock.knowledgeDocument.update).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
      data: { status: KnowledgeStatus.FAILED },
    });
    expect(cacheMock.delete).toHaveBeenCalledWith(
      KNOWLEDGE_DOCUMENTS_CACHE_KEY,
    );
  });

  it('fails fast when the source document does not exist', async () => {
    prismaMock.knowledgeDocument.findUnique.mockResolvedValue(null);

    await expect(service.indexDocument('missing-doc')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
