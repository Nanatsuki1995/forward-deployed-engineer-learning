import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateKnowledgeDocumentDto } from './dto/create-knowledge-document.dto';
import { UploadKnowledgeDocumentDto } from './dto/upload-knowledge-document.dto';
import {
  KnowledgeService,
  type UploadedKnowledgeFile,
} from './knowledge.service';

const KNOWLEDGE_UPLOAD_FILE_LIMIT = 1024 * 1024;

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

  @Post('upload')
  @Roles('admin', 'agent')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: KNOWLEDGE_UPLOAD_FILE_LIMIT },
    }),
  )
  @ApiOperation({ summary: '上传 Markdown 知识文档并生成分片索引' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: '街道热线知识手册' },
        source: { type: 'string', example: 'operations/playbook.md' },
        file: {
          type: 'string',
          format: 'binary',
          description: '支持 .md、.markdown 和 .txt，最大 1MB。',
        },
      },
      required: ['file'],
    },
  })
  upload(
    @Body() body: UploadKnowledgeDocumentDto,
    @UploadedFile() file?: UploadedKnowledgeFile,
  ) {
    return this.knowledgeService.upload(body, file);
  }
}
