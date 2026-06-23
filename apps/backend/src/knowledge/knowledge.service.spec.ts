import { BadRequestException } from '@nestjs/common';
import { KnowledgeStatus } from '@prisma/client';
import { EmbeddingService } from '../embedding/embedding.service';
import { KnowledgeIndexingQueue } from '../jobs/knowledge-indexing.queue';
import { KnowledgeIndexingService } from '../jobs/knowledge-indexing.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '../redis/redis-cache.service';
import { parseMarkdownKnowledge } from './knowledge-indexing';
import { KnowledgeService } from './knowledge.service';

type KnowledgeDocumentCreateArgs = {
  data: {
    title: string;
    source: string;
    content: string;
    chunks: number;
    citations: string[];
    status?: KnowledgeStatus;
  };
};

type StoredKnowledgeDocument = {
  id: string;
  title: string;
  source: string;
  content: string;
  status: KnowledgeStatus;
  chunks: number;
  citations: string[];
  createdAt: Date;
  updatedAt: Date;
};

type CreateKnowledgeDocumentMock = (
  args: KnowledgeDocumentCreateArgs,
) => Promise<StoredKnowledgeDocument>;
type FindManyKnowledgeDocumentMock = () => Promise<StoredKnowledgeDocument[]>;

describe('parseMarkdownKnowledge', () => {
  it('normalizes markdown and splits into text chunks without embeddings', () => {
    const parsed = parseMarkdownKnowledge(
      '# 标题\n\n- 第一段内容\n\n[引用](https://example.com)',
    );

    expect(parsed.content).toContain('标题');
    expect(parsed.content).toContain('第一段内容');
    expect(parsed.content).not.toContain('#');
    expect(parsed.citations).toEqual(['标题', '第一段内容', '引用']);
    expect(parsed.chunks).toHaveLength(1);
    expect(parsed.chunks[0]?.position).toBe(0);
    expect(parsed.chunks[0]?.startOffset).toBe(0);
    expect(parsed.chunks[0]?.content).toContain('标题');
  });
});

describe('KnowledgeService', () => {
  let prismaMock: {
    knowledgeDocument: {
      create: jest.MockedFunction<CreateKnowledgeDocumentMock>;
      findMany: jest.MockedFunction<FindManyKnowledgeDocumentMock>;
    };
  };
  let cacheMock: {
    getOrSet: jest.Mock;
    delete: jest.Mock;
  };
  let queueMock: {
    enqueueDocumentIndex: jest.Mock;
  };
  let indexerMock: {
    indexDocument: jest.Mock;
  };
  let embeddingMock: {
    embed: jest.Mock;
    embedSingle: jest.Mock;
  };
  let service: KnowledgeService;

  beforeEach(() => {
    const createKnowledgeDocument: CreateKnowledgeDocumentMock = (args) => {
      const { data } = args;

      return Promise.resolve({
        id: 'doc-1',
        title: data.title,
        source: data.source,
        content: data.content,
        status: data.status ?? KnowledgeStatus.INDEXED,
        chunks: data.chunks,
        citations: data.citations,
        createdAt: new Date('2026-06-16T00:00:00.000Z'),
        updatedAt: new Date('2026-06-16T00:00:00.000Z'),
      });
    };

    prismaMock = {
      knowledgeDocument: {
        create: jest.fn<CreateKnowledgeDocumentMock>(createKnowledgeDocument),
        findMany: jest
          .fn<FindManyKnowledgeDocumentMock>()
          .mockResolvedValue([]),
      },
    };

    cacheMock = {
      getOrSet: jest.fn((_key, _ttl, loader: () => Promise<unknown>) =>
        loader(),
      ),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    queueMock = {
      enqueueDocumentIndex: jest.fn().mockResolvedValue(true),
    };
    indexerMock = {
      indexDocument: jest.fn(),
    };
    embeddingMock = {
      embed: jest
        .fn()
        .mockResolvedValue(Array.from({ length: 16 }, () => 0.25)),
      embedSingle: jest
        .fn()
        .mockResolvedValue(Array.from({ length: 16 }, () => 0.25)),
    };

    service = new KnowledgeService(
      prismaMock as unknown as PrismaService,
      cacheMock as unknown as RedisCacheService,
      queueMock as unknown as KnowledgeIndexingQueue,
      indexerMock as unknown as KnowledgeIndexingService,
      embeddingMock as unknown as EmbeddingService,
    );
  });

  it('reads document lists through Redis cache', async () => {
    await service.findAll();

    expect(cacheMock.getOrSet).toHaveBeenCalled();
    expect(prismaMock.knowledgeDocument.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
    });
  });

  it('creates manual entries as processing documents and enqueues indexing', async () => {
    const document = await service.create({
      title: ' 手工 笔记 ',
      source: ' notes.md ',
      content: '**重点**\n\n第二段',
    });

    const createArgs = prismaMock.knowledgeDocument.create.mock.calls[0]?.[0];

    expect(createArgs?.data.title).toBe('手工 笔记');
    expect(createArgs?.data.source).toBe('notes.md');
    expect(createArgs?.data.status).toBe(KnowledgeStatus.PROCESSING);
    expect(createArgs?.data.chunks).toBe(0);
    expect(createArgs?.data.citations).toEqual(['后台索引中']);
    expect(queueMock.enqueueDocumentIndex).toHaveBeenCalledWith('doc-1');
    expect(indexerMock.indexDocument).not.toHaveBeenCalled();
    expect(document.title).toBe('手工 笔记');
    expect(document.source).toBe('notes.md');
    expect(document.status).toBe('processing');
  });

  it('rejects unsupported upload files', async () => {
    await expect(
      service.upload(
        {},
        {
          originalname: 'document.pdf',
          mimetype: 'application/pdf',
          size: 12,
          buffer: Buffer.from('pdf'),
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('stores uploaded markdown as indexed knowledge', async () => {
    const document = await service.upload(
      { title: '上传标题', source: 'uploaded.md' },
      {
        originalname: 'playbook.md',
        mimetype: 'text/markdown',
        size: 64,
        buffer: Buffer.from('# 规则\n\n第一段'),
      },
    );

    const createArgs = prismaMock.knowledgeDocument.create.mock.calls[0]?.[0];

    expect(createArgs?.data.title).toBe('上传标题');
    expect(createArgs?.data.source).toBe('uploaded.md');
    expect(createArgs?.data.status).toBe(KnowledgeStatus.PROCESSING);
    expect(createArgs?.data.chunks).toBe(0);
    expect(createArgs?.data.citations).toEqual(['后台索引中']);
    expect(queueMock.enqueueDocumentIndex).toHaveBeenCalledWith('doc-1');
    expect(document.source).toBe('uploaded.md');
    expect(document.status).toBe('processing');
  });

  it('indexes inline when Redis queue is unavailable', async () => {
    queueMock.enqueueDocumentIndex.mockResolvedValue(false);
    indexerMock.indexDocument.mockResolvedValue({
      id: 'doc-1',
      title: '上传标题',
      source: 'uploaded.md',
      content: '规则\n\n第一段',
      status: KnowledgeStatus.INDEXED,
      chunks: 1,
      citations: ['规则', '第一段'],
      createdAt: new Date('2026-06-16T00:00:00.000Z'),
      updatedAt: new Date('2026-06-16T00:00:00.000Z'),
    });

    const document = await service.upload(
      { title: '上传标题', source: 'uploaded.md' },
      {
        originalname: 'playbook.md',
        mimetype: 'text/markdown',
        size: 64,
        buffer: Buffer.from('# 规则\n\n第一段'),
      },
    );

    expect(indexerMock.indexDocument).toHaveBeenCalledWith('doc-1');
    expect(document.status).toBe('indexed');
    expect(document.chunks).toBe(1);
  });
});
