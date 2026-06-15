import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AiService } from './ai.service';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('tickets/:ticketId/reply-suggestion')
  @Roles('admin', 'agent', 'reviewer')
  @ApiOperation({ summary: '为工单生成 AI 回复建议' })
  @ApiParam({ name: 'ticketId', description: '工单 ID' })
  @ApiNotFoundResponse({ description: '工单不存在' })
  createReplySuggestion(@Param('ticketId') ticketId: string) {
    return this.aiService.createReplySuggestion(ticketId);
  }

  @Post('tickets/:ticketId/summary')
  @Roles('admin', 'agent', 'reviewer')
  @ApiOperation({ summary: '为工单生成 AI 摘要' })
  @ApiParam({ name: 'ticketId', description: '工单 ID' })
  @ApiNotFoundResponse({ description: '工单不存在' })
  createSummary(@Param('ticketId') ticketId: string) {
    return this.aiService.createSummary(ticketId);
  }

  @Get('logs')
  @ApiOperation({ summary: '查询 AI 调用日志' })
  findLogs() {
    return this.aiService.findLogs();
  }
}
