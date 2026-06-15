import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import type { TicketPriority } from '../../data/workbench.types';

export class CreateTicketDto {
  @ApiProperty({ example: '客户无法访问数据看板' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiProperty({
    example: '客户反馈生产环境数据看板返回 403，需要确认权限链路。',
  })
  @IsString()
  @MinLength(1)
  description!: string;

  @ApiPropertyOptional({ example: '权限问题' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    enum: ['low', 'medium', 'high', 'urgent'],
    example: 'high',
  })
  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority?: TicketPriority;

  @ApiPropertyOptional({ example: 'Acme Ops' })
  @IsOptional()
  @IsString()
  requester?: string;

  @ApiPropertyOptional({
    example: ['access-control', 'dashboard'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
