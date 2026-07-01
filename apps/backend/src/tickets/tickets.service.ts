import { Injectable, NotFoundException } from '@nestjs/common';
import { MessageRole } from '@prisma/client';
import {
  mapTicket,
  toPrismaTicketPriority,
  toPrismaTicketStatus,
} from '../data/workbench.mapper';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import type { TicketStatus } from '../data/workbench.types';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { CreateTicketDto } from './dto/create-ticket.dto';
import type { CreatePublicTicketDto } from './dto/create-public-ticket.dto';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll() {
    const tickets = await this.prisma.ticket.findMany({
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return tickets.map(mapTicket);
  }

  async findOne(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }

    return mapTicket(ticket);
  }

  async create(input: CreateTicketDto, user: AuthenticatedUser) {
    const ticket = await this.prisma.ticket.create({
      data: {
        title: input.title,
        description: input.description,
        category: input.category ?? '未分类',
        priority: toPrismaTicketPriority(input.priority),
        requester: input.requester ?? user.name,
        requesterUserId: user.id,
        assignee: '待分派',
        tags: input.tags ?? [],
        messages: {
          create: {
            author: input.requester ?? user.name,
            role: MessageRole.REQUESTER,
            content: input.description,
          },
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return mapTicket(ticket);
  }

  async createPublic(input: CreatePublicTicketDto) {
    const ticket = await this.prisma.ticket.create({
      data: {
        title: input.title,
        description: input.description,
        category: input.category ?? '未分类',
        priority: toPrismaTicketPriority(input.priority),
        requester: input.submitterName ?? '匿名用户',
        assignee: '待分派',
        source: 'public',
        submitterName: input.submitterName ?? null,
        submitterPhone: input.submitterPhone ?? null,
        submitterEmail: input.submitterEmail ?? null,
        tags: input.tags ?? [],
        messages: {
          create: {
            author: input.submitterName ?? '匿名用户',
            role: MessageRole.REQUESTER,
            content: input.description,
          },
        },
      },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    // Fire-and-forget notification push (don't block response)
    this.notificationsService.push(ticket.id, ticket.title).catch((err) => {
      console.error('Failed to push notification:', err);
    });

    return mapTicket(ticket);
  }

  async updateStatus(id: string, status: TicketStatus) {
    const existingTicket = await this.prisma.ticket.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingTicket) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }

    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: {
        status: toPrismaTicketStatus(status),
        messages: {
          create: {
            author: 'system',
            role: MessageRole.SYSTEM,
            content: `工单状态已更新为 ${status}`,
          },
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return mapTicket(ticket);
  }
}
