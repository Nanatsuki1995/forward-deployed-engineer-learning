import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NotificationBell } from './NotificationBell';

// Mock the notification context
const mockMarkRead = vi.fn().mockResolvedValue(undefined);
const mockMarkAllRead = vi.fn().mockResolvedValue(undefined);

const mockNotification = {
  id: '1',
  userId: 'user-1',
  ticketId: 'ticket-1',
  type: 'new_ticket',
  title: '新工单：测试',
  message: '测试消息',
  isRead: false,
  createdAt: new Date().toISOString(),
};

const mockReadNotification = {
  id: '2',
  userId: 'user-1',
  ticketId: 'ticket-2',
  type: 'new_ticket',
  title: '新工单：已读',
  message: '已读消息',
  isRead: true,
  createdAt: new Date().toISOString(),
};

vi.mock('../../notifications/NotificationContext', () => ({
  useNotification: () => ({
    notifications: [mockNotification, mockReadNotification],
    unreadCount: 1,
    connected: true,
    markRead: mockMarkRead,
    markAllRead: mockMarkAllRead,
  }),
  NotificationProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMarkRead.mockResolvedValue(undefined);
    mockMarkAllRead.mockResolvedValue(undefined);
  });

  it('should display unread badge count', () => {
    render(<NotificationBell />);
    // Ant Design Badge shows the count in a sup element
    const badge = document.querySelector('.ant-badge-count') as HTMLElement;
    expect(badge).toBeDefined();
    expect(badge.textContent).toBe('1');
  });

  it('should show notification dropdown on click', async () => {
    render(<NotificationBell />);
    const bellButton = document.querySelector('.ant-btn') as HTMLElement;
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText('新工单：测试')).toBeDefined();
      expect(screen.getByText('新工单：已读')).toBeDefined();
    });
  });

  it('should show "mark all read" button when there are unread', async () => {
    render(<NotificationBell />);
    const bellButton = document.querySelector('.ant-btn') as HTMLElement;
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText('全部已读')).toBeDefined();
    });
  });

  it('should call markRead when clicking unread item', async () => {
    render(<NotificationBell />);
    const bellButton = document.querySelector('.ant-btn') as HTMLElement;
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText('新工单：测试')).toBeDefined();
    });

    fireEvent.click(screen.getByText('新工单：测试'));
    expect(mockMarkRead).toHaveBeenCalledWith('1');
  });
});
