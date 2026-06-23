import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TicketSnapshot {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  requester: string;
  assignee: string;
  tags: string[];
  replayedUntil: string;
  eventsApplied: number;
}

@Injectable()
export class TicketReplayService {
  constructor(private readonly prisma: PrismaService) {}

  async replayTicketState(
    ticketId: string,
    until: Date,
  ): Promise<TicketSnapshot> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }

    // Fetch audit events for this ticket up to the target time
    const events = await this.prisma.auditLog.findMany({
      where: {
        resource: 'ticket',
        resourceId: ticketId,
        createdAt: { lte: until },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Start from initial state and replay events
    const state: Record<string, unknown> = {
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      category: ticket.category,
      status: ticket.status,
      priority: ticket.priority,
      requester: ticket.requester,
      assignee: ticket.assignee,
      tags: ticket.tags,
    };

    for (const event of events) {
      const meta = event.metadata as Record<string, unknown> | null;
      if (meta?.changes) {
        const changes = meta.changes as Record<string, unknown>;
        for (const [key, value] of Object.entries(changes)) {
          state[key] = value;
        }
      }
    }

    return {
      id: ticket.id,
      title: state.title as string,
      description: state.description as string,
      category: state.category as string,
      status: state.status as string,
      priority: state.priority as string,
      requester: state.requester as string,
      assignee: state.assignee as string,
      tags: state.tags as string[],
      replayedUntil: until.toISOString(),
      eventsApplied: events.length,
    };
  }
}
