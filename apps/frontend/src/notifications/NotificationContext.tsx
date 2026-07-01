import { notification as antdNotification } from 'antd';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api, type Notification as NotifItem } from '../api/client';
import { useAuth } from '../auth/useAuth';

interface NotificationContextValue {
  notifications: NotifItem[];
  unreadCount: number;
  connected: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [apiNotification, contextHolder] = antdNotification.useNotification();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Load historical notifications
  const loadNotifications = useCallback(async () => {
    try {
      const list = await api.notifications();
      setNotifications(list);
    } catch {
      // SSE connection failure is non-critical
    }
  }, []);

  // SSE connection
  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'agent')) return;

    const token = window.localStorage.getItem('fde-learning-access-token');
    if (!token) return;

    const url = `/api/notifications/stream?authorization=Bearer%20${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as NotifItem;
        setNotifications((prev) => [data, ...prev]);
        apiNotification.info({
          message: data.title,
          description: data.message,
          placement: 'bottomRight',
        });
      } catch {
        // Ignore malformed SSE events
      }
    };

    es.onerror = () => {
      setConnected(false);
      // EventSource auto-reconnects by default
    };

    // Load history on mount
    void loadNotifications();

    return () => {
      es.close();
      setConnected(false);
    };
  }, [user, loadNotifications, apiNotification]);

  const markRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    } catch {
      // Silently fail
    }
  };

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // Silently fail
    }
  };

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, connected, markRead, markAllRead }}
    >
      {contextHolder}
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return ctx;
}
