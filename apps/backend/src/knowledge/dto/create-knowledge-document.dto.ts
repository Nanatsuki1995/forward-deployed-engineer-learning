import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateKnowledgeDocumentDto {
  @ApiProperty({ example: '权限排查手册' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiPropertyOptional({ example: 'manual-entry' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({
    example: '当客户访问数据看板失败时，先确认用户角色、租户绑定和审计日志。',
  })
  @IsOptional()
  @IsString()
  content?: string;
}
