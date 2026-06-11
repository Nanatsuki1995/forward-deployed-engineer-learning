import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AiService } from './ai.service';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('tickets/:ticketId/reply-suggestion')
  @Roles('admin', 'agent', 'reviewer')
  createReplySuggestion(@Param('ticketId') ticketId: string) {
    return this.aiService.createReplySuggestion(ticketId);
  }

  @Post('tickets/:ticketId/summary')
  @Roles('admin', 'agent', 'reviewer')
  createSummary(@Param('ticketId') ticketId: string) {
    return this.aiService.createSummary(ticketId);
  }

  @Get('logs')
  findLogs() {
    return this.aiService.findLogs();
  }
}
