import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { TicketsService } from './tickets.service';
import type { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('tickets')
@ApiBearerAuth()
@Controller('tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @ApiOperation({ summary: '查询工单列表' })
  findAll() {
    return this.ticketsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '查询单个工单' })
  @ApiParam({ name: 'id', description: '工单 ID' })
  @ApiNotFoundResponse({ description: '工单不存在' })
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Post()
  @Roles('admin', 'agent')
  @ApiOperation({ summary: '创建工单' })
  @ApiBody({ type: CreateTicketDto })
  create(
    @Body() body: CreateTicketDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.create(body, user);
  }

  @Patch(':id/status')
  @Roles('admin', 'agent', 'reviewer')
  @ApiOperation({ summary: '更新工单状态' })
  @ApiParam({ name: 'id', description: '工单 ID' })
  @ApiBody({ type: UpdateTicketStatusDto })
  @ApiNotFoundResponse({ description: '工单不存在' })
  updateStatus(@Param('id') id: string, @Body() body: UpdateTicketStatusDto) {
    return this.ticketsService.updateStatus(id, body.status);
  }
}
