import { NotFoundException } from '@nestjs/common';
import { MessageRole, TicketPriority, TicketStatus, type Ticket as PrismaTicket, type TicketMessage as PrismaTicketMessage } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { TicketsService } from './tickets.service';

interface PrismaMock {
  ticket: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
}

describe('TicketsService', () => {
  let service: TicketsService;
  let prismaMock: PrismaMock;
  let notificationsMock: { push: jest.Mock };

  beforeEach(() => {
    prismaMock = {
      ticket: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    notificationsMock = {
      push: jest.fn().mockResolvedValue(undefined),
    };

    service = new TicketsService(
      prismaMock as unknown as PrismaService,
      notificationsMock as unknown as NotificationsService,
    );
  });

  describe('findAll', () => {
    it('should return mapped tickets', async () => {
      const now = new Date();
      const mockTickets: (PrismaTicket & { messages: PrismaTicketMessage[] })[] = [
        {
          id: 't-1',
          title: '标题',
          description: '描述',
          category: '权限问题',
          status: TicketStatus.NEW,
          priority: TicketPriority.HIGH,
          requester: '用户A',
          requesterUserId: null,
          assignee: '待分派',
          assigneeUserId: null,
          tags: ['access-control'],
          submitterName: null,
          submitterPhone: null,
          submitterEmail: null,
          source: 'internal',
          createdAt: now,
          updatedAt: now,
          messages: [],
        },
      ];

      prismaMock.ticket.findMany.mockResolvedValue(mockTickets);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 't-1',
        title: '标题',
        description: '描述',
        category: '权限问题',
        status: 'new',
        priority: 'high',
        requester: '用户A',
        assignee: '待分派',
        tags: ['access-control'],
        submitterName: undefined,
        submitterPhone: undefined,
        submitterEmail: undefined,
        source: 'internal',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        messages: [],
      });
      expect(prismaMock.ticket.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return a mapped ticket by id', async () => {
      const now = new Date();
      const mockTicket: PrismaTicket & { messages: PrismaTicketMessage[] } = {
        id: 't-1',
        title: '标题',
        description: '描述',
        category: '未分类',
        status: TicketStatus.NEW,
        priority: TicketPriority.MEDIUM,
        requester: '用户',
        requesterUserId: null,
        assignee: '待分派',
        assigneeUserId: null,
        tags: [],
        submitterName: null,
        submitterPhone: null,
        submitterEmail: null,
        source: 'internal',
        createdAt: now,
        updatedAt: now,
        messages: [],
      };

      prismaMock.ticket.findUnique.mockResolvedValue(mockTicket);

      const result = await service.findOne('t-1');

      expect(result.id).toBe('t-1');
      expect(result.status).toBe('new');
      expect(result.requester).toBe('用户');
      expect(prismaMock.ticket.findUnique).toHaveBeenCalledWith({
        where: { id: 't-1' },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
    });

    it('should throw NotFoundException when ticket not found', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const user = { id: 'user-agent', name: 'Agent', email: 'agent@example.com', role: 'agent' as const };

    it('should create a ticket with authenticated user as requester', async () => {
      const now = new Date();
      const mockTicket: PrismaTicket & { messages: PrismaTicketMessage[] } = {
        id: 't-new',
        title: '新工单',
        description: '描述',
        category: '未分类',
        status: TicketStatus.NEW,
        priority: TicketPriority.MEDIUM,
        requester: 'Agent',
        requesterUserId: 'user-agent',
        assignee: '待分派',
        assigneeUserId: null,
        tags: [],
        submitterName: null,
        submitterPhone: null,
        submitterEmail: null,
        source: 'internal',
        createdAt: now,
        updatedAt: now,
        messages: [],
      };

      prismaMock.ticket.create.mockResolvedValue(mockTicket);

      const result = await service.create(
        { title: '新工单', description: '描述' },
        user,
      );

      expect(result.requester).toBe('Agent');
      expect(result.status).toBe('new');
      expect(result.priority).toBe('medium');
      expect(prismaMock.ticket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: '新工单',
            requester: 'Agent',
            requesterUserId: 'user-agent',
            assignee: '待分派',
          }),
        }),
      );
    });

    it('should use input requester when provided', async () => {
      const now = new Date();
      const mockTicket: PrismaTicket & { messages: PrismaTicketMessage[] } = {
        id: 't-2',
        title: '工单',
        description: '描述',
        category: '未分类',
        status: TicketStatus.NEW,
        priority: TicketPriority.MEDIUM,
        requester: '客户A',
        requesterUserId: 'user-agent',
        assignee: '待分派',
        assigneeUserId: null,
        tags: [],
        submitterName: null,
        submitterPhone: null,
        submitterEmail: null,
        source: 'internal',
        createdAt: now,
        updatedAt: now,
        messages: [],
      };

      prismaMock.ticket.create.mockResolvedValue(mockTicket);

      await service.create(
        { title: '工单', description: '描述', requester: '客户A' },
        user,
      );

      expect(prismaMock.ticket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            requester: '客户A',
          }),
        }),
      );
    });
  });

  describe('createPublic', () => {
    const now = new Date();
    const fullDto = {
      title: '测试工单',
      description: '测试描述',
      submitterName: '张三',
      submitterPhone: '13800138000',
      submitterEmail: 'test@example.com',
      category: '权限问题',
      priority: 'high' as const,
      tags: ['access-control'],
    };

    function makeMockTicket(
      overrides: Partial<
        PrismaTicket & { messages: PrismaTicketMessage[] }
      > = {},
    ): PrismaTicket & { messages: PrismaTicketMessage[] } {
      return {
        id: 'ticket-1',
        title: '测试工单',
        description: '测试描述',
        category: '权限问题',
        status: TicketStatus.NEW,
        priority: TicketPriority.HIGH,
        requester: '张三',
        requesterUserId: null,
        assignee: '待分派',
        assigneeUserId: null,
        tags: ['access-control'],
        submitterName: '张三',
        submitterPhone: '13800138000',
        submitterEmail: 'test@example.com',
        source: 'public',
        createdAt: now,
        updatedAt: now,
        messages: [],
        ...overrides,
      };
    }

    it('should create a ticket with public source and all fields', async () => {
      prismaMock.ticket.create.mockResolvedValue(makeMockTicket());

      const result = await service.createPublic(fullDto);

      expect(result.source).toBe('public');
      expect(result.submitterName).toBe('张三');
      expect(result.submitterPhone).toBe('13800138000');
      expect(result.submitterEmail).toBe('test@example.com');
      expect(result.requester).toBe('张三');
      expect(result.status).toBe('new');
      expect(result.priority).toBe('high');
      expect(result.tags).toEqual(['access-control']);
      expect(prismaMock.ticket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            source: 'public',
            submitterName: '张三',
            submitterPhone: '13800138000',
            submitterEmail: 'test@example.com',
            requester: '张三',
            assignee: '待分派',
            priority: TicketPriority.HIGH,
            tags: ['access-control'],
          }),
        }),
      );
    });

    it('should default requester to 匿名用户 when no name provided', async () => {
      prismaMock.ticket.create.mockResolvedValue(
        makeMockTicket({
          title: 'Test',
          description: 'Test desc',
          category: '未分类',
          priority: TicketPriority.MEDIUM,
          requester: '匿名用户',
          tags: [],
          submitterName: null,
          submitterPhone: null,
          submitterEmail: null,
        }),
      );

      const result = await service.createPublic({
        title: 'Test',
        description: 'Test desc',
      });

      expect(result.requester).toBe('匿名用户');
      expect(result.submitterName).toBeUndefined();
      expect(result.submitterPhone).toBeUndefined();
      expect(result.submitterEmail).toBeUndefined();
    });

    it('should push notification after ticket creation', async () => {
      prismaMock.ticket.create.mockResolvedValue(makeMockTicket());

      await service.createPublic({ title: 'T', description: 'D' });

      expect(notificationsMock.push).toHaveBeenCalledWith('ticket-1', '测试工单');
    });

    it('should swallow notification push errors', async () => {
      prismaMock.ticket.create.mockResolvedValue(makeMockTicket());
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      notificationsMock.push.mockRejectedValueOnce(new Error('Push failed'));

      // Should not throw even though notification fails
      const result = await service.createPublic({ title: 'T', description: 'D' });

      expect(result.id).toBe('ticket-1');
      expect(notificationsMock.push).toHaveBeenCalled();
      // After push rejection, console.error should be called (fire-and-forget)
      await new Promise((r) => setTimeout(r, 10));
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should default category to 未分类 when not provided', async () => {
      prismaMock.ticket.create.mockResolvedValue(
        makeMockTicket({ category: '未分类', tags: [] }),
      );

      await service.createPublic({ title: 'T', description: 'D' });

      expect(prismaMock.ticket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            category: '未分类',
          }),
        }),
      );
    });

    it('should default priority to medium when not provided', async () => {
      prismaMock.ticket.create.mockResolvedValue(
        makeMockTicket({ priority: TicketPriority.MEDIUM }),
      );

      await service.createPublic({ title: 'T', description: 'D' });

      expect(prismaMock.ticket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            priority: TicketPriority.MEDIUM,
          }),
        }),
      );
    });

    it('should include messages in the created ticket', async () => {
      prismaMock.ticket.create.mockResolvedValue(makeMockTicket());

      const result = await service.createPublic(fullDto);

      expect(result.messages).toBeDefined();
      expect(prismaMock.ticket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { messages: { orderBy: { createdAt: 'asc' } } },
        }),
      );
    });
  });

  describe('updateStatus', () => {
    const now = new Date();

    it('should update ticket status and add system message', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue({ id: 't-1' });
      prismaMock.ticket.update.mockResolvedValue({
        id: 't-1',
        title: '工单',
        description: '描述',
        category: '未分类',
        status: TicketStatus.IN_PROGRESS,
        priority: TicketPriority.MEDIUM,
        requester: '用户A',
        requesterUserId: null,
        assignee: '待分派',
        assigneeUserId: null,
        tags: [],
        submitterName: null,
        submitterPhone: null,
        submitterEmail: null,
        source: 'internal',
        createdAt: now,
        updatedAt: now,
        messages: [],
      } as PrismaTicket & { messages: PrismaTicketMessage[] });

      const result = await service.updateStatus('t-1', 'in_progress');

      expect(result.status).toBe('in_progress');
      expect(prismaMock.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 't-1' },
          data: expect.objectContaining({
            status: TicketStatus.IN_PROGRESS,
          }),
        }),
      );
    });

    it('should throw NotFoundException when ticket not found', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('nonexistent', 'resolved'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
