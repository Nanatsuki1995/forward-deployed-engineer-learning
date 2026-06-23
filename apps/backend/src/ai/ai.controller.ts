import {
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Auditable } from '../audit/audit.decorator';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AiService } from './ai.service';
import type { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('tickets/:ticketId/reply-suggestion')
  @Roles('admin', 'agent', 'reviewer')
  @Auditable('ai')
  @ApiOperation({ summary: '为工单生成 AI 回复建议' })
  @ApiParam({ name: 'ticketId', description: '工单 ID' })
  @ApiNotFoundResponse({ description: '工单不存在' })
  createReplySuggestion(
    @Param('ticketId') ticketId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiService.createReplySuggestion(ticketId, user);
  }

  @Post('tickets/:ticketId/summary')
  @Roles('admin', 'agent', 'reviewer')
  @Auditable('ai')
  @ApiOperation({ summary: '为工单生成 AI 摘要' })
  @ApiParam({ name: 'ticketId', description: '工单 ID' })
  @ApiNotFoundResponse({ description: '工单不存在' })
  createSummary(
    @Param('ticketId') ticketId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiService.createSummary(ticketId, user);
  }

  @Get('logs')
  @Auditable('ai')
  @ApiOperation({ summary: '查询 AI 调用日志' })
  findLogs() {
    return this.aiService.findLogs();
  }
}
