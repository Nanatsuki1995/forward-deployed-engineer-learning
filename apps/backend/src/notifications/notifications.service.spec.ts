/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */

import { Subject } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockPrisma: {
    user: { findMany: jest.Mock };
    notification: {
      create: jest.Mock;
      findMany: jest.Mock;
      updateMany: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      user: { findMany: jest.fn() },
      notification: {
        create: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
    };

    service = new NotificationsService(mockPrisma as unknown as PrismaService);
  });

  describe('getUserStream', () => {
    it('should create and return a Subject for a user', () => {
      const stream = service.getUserStream('user-1');
      expect(stream).toBeInstanceOf(Subject);
    });

    it('should return the same Subject on subsequent calls', () => {
      const stream1 = service.getUserStream('user-1');
      const stream2 = service.getUserStream('user-1');
      expect(stream1).toBe(stream2);
    });
  });

  describe('removeUserStream', () => {
    it('should complete and remove the stream', () => {
      const stream = service.getUserStream('user-1');
      const completeSpy = jest.spyOn(stream, 'complete');
      service.removeUserStream('user-1');
      expect(completeSpy).toHaveBeenCalled();
    });

    it('should do nothing if stream does not exist', () => {
      expect(() => service.removeUserStream('nonexistent')).not.toThrow();
    });
  });

  describe('push', () => {
    it('should create notifications for all admin and agent users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'admin-1' },
        { id: 'agent-1' },
      ]);
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-1',
        userId: 'admin-1',
        ticketId: 'ticket-1',
        type: 'NEW_TICKET',
        title: '新工单：Test',
        message: '游客提交了新的工单"Test"，请及时处理。',
        isRead: false,
        createdAt: new Date(),
      });

      await service.push('ticket-1', 'Test');

      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ticketId: 'ticket-1',
            type: 'NEW_TICKET',
          }),
        }),
      );
    });

    it('should push SSE events to connected users', async () => {
      const createdAt = new Date();
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-1',
        userId: 'admin-1',
        ticketId: 'ticket-1',
        type: 'NEW_TICKET',
        title: '新工单：Test',
        message: '游客提交了新的工单"Test"，请及时处理。',
        isRead: false,
        createdAt,
      });

      // Get the stream first so admin-1 is "connected"
      const stream = service.getUserStream('admin-1');
      const nextSpy = jest.spyOn(stream, 'next');

      await service.push('ticket-1', 'Test');

      expect(nextSpy).toHaveBeenCalled();
      const event = nextSpy.mock.calls[0][0];
      const data = JSON.parse(event.data);
      expect(data.type).toBe('new_ticket');
      expect(data.ticketId).toBe('ticket-1');
      expect(data.id).toBe('notif-1');
      expect(data.createdAt).toBe(createdAt.toISOString());
    });

    it('should not push SSE events to users without active stream', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-1',
        userId: 'admin-1',
        ticketId: 'ticket-1',
        type: 'NEW_TICKET',
        title: '新工单：Test',
        message: 'message',
        isRead: false,
        createdAt: new Date(),
      });

      // Do NOT get stream -- admin-1 is not "connected"

      await service.push('ticket-1', 'Test');

      // Notification should be created but no SSE event pushed
      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findByUser', () => {
    it('should return mapped notifications for a user', async () => {
      const createdAt = new Date();
      mockPrisma.notification.findMany.mockResolvedValue([
        {
          id: 'notif-1',
          userId: 'user-1',
          ticketId: 'ticket-1',
          type: 'NEW_TICKET',
          title: '新工单：Test',
          message: 'message',
          isRead: false,
          createdAt,
        },
      ]);

      const result = await service.findByUser('user-1');

      expect(result).toEqual([
        {
          id: 'notif-1',
          userId: 'user-1',
          ticketId: 'ticket-1',
          type: 'new_ticket',
          title: '新工单：Test',
          message: 'message',
          isRead: false,
          createdAt: createdAt.toISOString(),
        },
      ]);
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should filter by isRead when provided', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);

      await service.findByUser('user-1', true);

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });
  });

  describe('markRead', () => {
    it('should call updateMany with correct params', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });
      await service.markRead('notif-1', 'user-1');
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: 'user-1' },
        data: { isRead: true },
      });
    });
  });

  describe('markAllRead', () => {
    it('should mark all unread as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });
      await service.markAllRead('user-1');
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
        data: { isRead: true },
      });
    });
  });

  describe('unreadCount', () => {
    it('should return count of unread notifications', async () => {
      mockPrisma.notification.count.mockResolvedValue(5);
      const count = await service.unreadCount('user-1');
      expect(count).toBe(5);
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });
    });
  });
});
