import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UploadKnowledgeDocumentDto {
  @ApiPropertyOptional({ example: '街道热线知识手册' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional({ example: 'operations/playbook.md' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  source?: string;
}
