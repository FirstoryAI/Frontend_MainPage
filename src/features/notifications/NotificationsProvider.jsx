import { useCallback, useEffect, useMemo, useState } from 'react';
import { NotificationsContext } from './notificationsContext';
import { readNotifications, writeNotifications } from './notificationStorage';

const MAX_NOTIFICATIONS = 20;

// 알림 하나: { id, title, message, href, createdAt, read }
export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState(readNotifications);

  useEffect(() => {
    writeNotifications(notifications);
  }, [notifications]);

  const addNotification = useCallback((notification) => {
    setNotifications((current) => {
      if (current.some((item) => item.id === notification.id)) return current;
      const added = { createdAt: new Date().toISOString(), ...notification, read: false };
      return [added, ...current].slice(0, MAX_NOTIFICATIONS);
    });
  }, []);

  const markRead = useCallback((id) => {
    setNotifications((current) =>
      current.some((item) => item.id === id && !item.read)
        ? current.map((item) => (item.id === id ? { ...item, read: true } : item))
        : current,
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((current) =>
      current.some((item) => !item.read)
        ? current.map((item) => ({ ...item, read: true }))
        : current,
    );
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount: notifications.filter((item) => !item.read).length,
      addNotification,
      markRead,
      markAllRead,
    }),
    [notifications, addNotification, markRead, markAllRead],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
