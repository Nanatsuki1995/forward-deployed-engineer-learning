import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { KnowledgeService } from './knowledge.service';
import type { CreateKnowledgeDocumentBody } from './knowledge.service';

@Controller('knowledge')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get()
  findAll() {
    return this.knowledgeService.findAll();
  }

  @Post()
  @Roles('admin', 'agent')
  create(@Body() body: CreateKnowledgeDocumentBody) {
    return this.knowledgeService.create(body);
  }
}
