import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Auditable } from '../audit/audit.decorator';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { CurrentUser } from '../auth/current-user.decorator';
import { FieldPermissions } from '../auth/field-permissions.decorator';
import { FieldPermissionsInterceptor } from '../auth/field-permissions.interceptor';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreatePublicTicketDto } from './dto/create-public-ticket.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TicketReplayDto } from './dto/ticket-replay.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { TicketReplayService } from './ticket-replay.service';
import { TicketsService } from './tickets.service';
import type { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('tickets')
@ApiBearerAuth()
@Controller('tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor, FieldPermissionsInterceptor)
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly replayService: TicketReplayService,
  ) {}

  @Get()
  @Auditable('ticket')
  @FieldPermissions('ticket')
  @ApiOperation({ summary: '查询工单列表' })
  findAll() {
    return this.ticketsService.findAll();
  }

  @Get(':id')
  @Auditable('ticket')
  @FieldPermissions('ticket')
  @ApiOperation({ summary: '查询单个工单' })
  @ApiParam({ name: 'id', description: '工单 ID' })
  @ApiNotFoundResponse({ description: '工单不存在' })
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Post()
  @Roles('admin', 'agent')
  @Auditable('ticket')
  @ApiOperation({ summary: '创建工单' })
  @ApiBody({ type: CreateTicketDto })
  create(
    @Body() body: CreateTicketDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.create(body, user);
  }

  @Post('public')
  @Public()
  @Auditable('ticket')
  @ApiOperation({ summary: '公开创建工单（无需登录）' })
  @ApiBody({ type: CreatePublicTicketDto })
  createPublic(@Body() body: CreatePublicTicketDto) {
    return this.ticketsService.createPublic(body);
  }

  @Patch(':id/status')
  @Roles('admin', 'agent', 'reviewer')
  @Auditable('ticket')
  @ApiOperation({ summary: '更新工单状态' })
  @ApiParam({ name: 'id', description: '工单 ID' })
  @ApiBody({ type: UpdateTicketStatusDto })
  @ApiNotFoundResponse({ description: '工单不存在' })
  updateStatus(@Param('id') id: string, @Body() body: UpdateTicketStatusDto) {
    return this.ticketsService.updateStatus(id, body.status);
  }

  @Post(':id/replay')
  @Roles('admin')
  @ApiOperation({ summary: '操作回放：恢复到指定时间点的工单状态（仅管理员）' })
  @ApiParam({ name: 'id', description: '工单 ID' })
  @ApiBody({ type: TicketReplayDto })
  replay(@Param('id') id: string, @Body() body: TicketReplayDto) {
    return this.replayService.replayTicketState(id, new Date(body.until));
  }
}
