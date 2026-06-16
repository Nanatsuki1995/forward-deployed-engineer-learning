import { BadRequestException } from '@nestjs/common';
import { KnowledgeStatus } from '@prisma/client';
import { KnowledgeService, parseMarkdownKnowledge } from './knowledge.service';
import { PrismaService } from '../prisma/prisma.service';

type KnowledgeChunkCreateInput = {
  position: number;
  content: string;
  startOffset: number;
  endOffset: number;
  embedding: number[];
};

type KnowledgeDocumentCreateArgs = {
  data: {
    title: string;
    source: string;
    content: string;
    chunks: number;
    citations: string[];
    status?: KnowledgeStatus;
    chunkRecords: {
      create: KnowledgeChunkCreateInput[];
    };
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
  it('normalizes markdown, splits chunks and builds embeddings', () => {
    const parsed = parseMarkdownKnowledge(
      '# 标题\n\n- 第一段内容\n\n[引用](https://example.com)',
    );

    expect(parsed.content).toContain('标题');
    expect(parsed.content).toContain('第一段内容');
    expect(parsed.content).not.toContain('#');
    expect(parsed.citations).toEqual(['标题', '第一段内容', '引用']);
    expect(parsed.chunks).toHaveLength(1);
    expect(parsed.chunks[0]?.embedding).toHaveLength(16);
    expect(parsed.chunks[0]?.startOffset).toBe(0);
  });
});

describe('KnowledgeService', () => {
  let prismaMock: {
    knowledgeDocument: {
      create: jest.MockedFunction<CreateKnowledgeDocumentMock>;
      findMany: jest.MockedFunction<FindManyKnowledgeDocumentMock>;
    };
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

    service = new KnowledgeService(prismaMock as unknown as PrismaService);
  });

  it('creates manual entries through the markdown pipeline', async () => {
    const document = await service.create({
      title: ' 手工 笔记 ',
      source: ' notes.md ',
      content: '**重点**\n\n第二段',
    });

    const createArgs = prismaMock.knowledgeDocument.create.mock.calls[0]?.[0];

    expect(createArgs?.data.title).toBe('手工 笔记');
    expect(createArgs?.data.source).toBe('notes.md');
    expect(createArgs?.data.chunks).toBe(1);
    expect(createArgs?.data.citations).toEqual(['人工录入']);
    expect(document.title).toBe('手工 笔记');
    expect(document.source).toBe('notes.md');
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
    expect(createArgs?.data.chunks).toBe(1);
    expect(createArgs?.data.citations).toEqual(['规则', '第一段']);
    expect(createArgs?.data.chunkRecords.create).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          position: 0,
          startOffset: 0,
          endOffset: expect.any(Number) as number,
        }),
      ]),
    );
    expect(createArgs?.data.status).toBeUndefined();
    expect(document.source).toBe('uploaded.md');
  });
});
