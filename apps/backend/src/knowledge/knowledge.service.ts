import { Injectable } from '@nestjs/common';
import { mapKnowledgeDocument } from '../data/workbench.mapper';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateKnowledgeDocumentBody {
  title: string;
  source?: string;
  content?: string;
}

@Injectable()
export class KnowledgeService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const documents = await this.prisma.knowledgeDocument.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return documents.map(mapKnowledgeDocument);
  }

  async create(input: CreateKnowledgeDocumentBody) {
    const document = await this.prisma.knowledgeDocument.create({
      data: {
        title: input.title,
        source: input.source ?? 'manual-entry',
        content: input.content ?? '',
        chunks: Math.max(1, Math.ceil((input.content?.length ?? 120) / 120)),
        citations: ['人工录入'],
      },
    });

    return mapKnowledgeDocument(document);
  }
}
