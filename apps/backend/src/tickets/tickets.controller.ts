import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { TicketsService } from './tickets.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { TicketStatus } from '../data/workbench.types';
import type { CreateTicketBody } from './tickets.service';

interface UpdateTicketStatusBody {
  status: TicketStatus;
}

@Controller('tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  findAll() {
    return this.ticketsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Post()
  @Roles('admin', 'agent')
  create(
    @Body() body: CreateTicketBody,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.create(body, user);
  }

  @Patch(':id/status')
  @Roles('admin', 'agent', 'reviewer')
  updateStatus(@Param('id') id: string, @Body() body: UpdateTicketStatusBody) {
    return this.ticketsService.updateStatus(id, body.status);
  }
}
