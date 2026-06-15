import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateKnowledgeDocumentDto } from './dto/create-knowledge-document.dto';
import { KnowledgeService } from './knowledge.service';

@ApiTags('knowledge')
@ApiBearerAuth()
@Controller('knowledge')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get()
  @ApiOperation({ summary: '查询知识库文档列表' })
  findAll() {
    return this.knowledgeService.findAll();
  }

  @Post()
  @Roles('admin', 'agent')
  @ApiOperation({ summary: '创建知识库文档' })
  @ApiBody({ type: CreateKnowledgeDocumentDto })
  create(@Body() body: CreateKnowledgeDocumentDto) {
    return this.knowledgeService.create(body);
  }
}
