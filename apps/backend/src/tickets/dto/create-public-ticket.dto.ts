import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreatePublicTicketDto {
  @ApiProperty({ example: '数据看板无法访问' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiProperty({ example: '客户反馈生产环境数据看板返回 403' })
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
  priority?: string;

  @ApiPropertyOptional({ example: '张三' })
  @IsOptional()
  @IsString()
  submitterName?: string;

  @ApiPropertyOptional({ example: '13800138000' })
  @IsOptional()
  @IsString()
  submitterPhone?: string;

  @ApiPropertyOptional({ example: 'zhangsan@example.com' })
  @IsOptional()
  @IsEmail()
  submitterEmail?: string;

  @ApiPropertyOptional({ example: ['access-control'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
