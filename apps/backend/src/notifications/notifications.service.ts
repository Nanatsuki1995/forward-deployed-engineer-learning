import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { mapNotification } from '../data/workbench.mapper';

@Injectable()
export class NotificationsService {
  private userStreams = new Map<string, Subject<MessageEvent>>();

  constructor(private readonly prisma: PrismaService) {}

  getUserStream(userId: string): Subject<MessageEvent> {
    if (!this.userStreams.has(userId)) {
      this.userStreams.set(userId, new Subject<MessageEvent>());
    }
    return this.userStreams.get(userId)!;
  }

  removeUserStream(userId: string) {
    const stream = this.userStreams.get(userId);
    if (stream) {
      stream.complete();
      this.userStreams.delete(userId);
    }
  }

  async push(ticketId: string, ticketTitle: string) {
    const users = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'AGENT'] } },
      select: { id: true },
    });

    for (const user of users) {
      const notification = await this.prisma.notification.create({
        data: {
          userId: user.id,
          ticketId,
          type: 'NEW_TICKET',
          title: `新工单：${ticketTitle}`,
          message: `游客提交了新的工单"${ticketTitle}"，请及时处理。`,
        },
      });

      const stream = this.userStreams.get(user.id);
      if (stream) {
        stream.next({
          data: JSON.stringify({
            id: notification.id,
            ticketId,
            type: 'new_ticket',
            title: notification.title,
            message: notification.message,
            createdAt: notification.createdAt.toISOString(),
          }),
        } as MessageEvent);
      }
    }
  }

  async findByUser(userId: string, isRead?: boolean) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId, ...(isRead !== undefined ? { isRead } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return notifications.map((n) => mapNotification(n));
  }

  async markRead(id: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async unreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }
}
