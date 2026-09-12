"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { WorkerNotification } from '@/lib/notifications';

type NotificationUpdate = 'read' | 'unread' | 'resolve';
type Value = {
  notifications: WorkerNotification[];
  unreadCount: number;
  actionCount: number;
  loading: boolean;
  updateNotification: (id: string, action: NotificationUpdate) => Promise<void>;
  markAllRead: () => Promise<void>;
  addNotification: (notification: WorkerNotification) => void;
};

const NotificationContext = createContext<Value | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<WorkerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const portalScope = pathname.split('/')[1] ?? '';

  useEffect(() => {
    let active = true;
    fetch('/api/notifications')
      .then(async response => {
        if (response.status === 401) {
          if (active) router.push('/?reason=session');
          return;
        }
        const result = await response.json() as { data?: WorkerNotification[] };
        if (!response.ok || !result.data) throw new Error('Notification feed could not be loaded.');
        if (active) setNotifications(result.data);
      })
      .catch(() => { if (active) setNotifications([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [portalScope, router]);

  const updateNotification = useCallback(async (id: string, action: NotificationUpdate) => {
    const existing = notifications.find(item => item.id === id);
    if (!existing) return;
    const response = await fetch('/api/notifications', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id, action, href:existing.href }) });
    if (!response.ok) throw new Error('Notification could not be updated.');
    setNotifications(current => current.map(item => item.id === id ? { ...item, read:action === 'unread' ? false : true, resolved:action === 'resolve' ? true : item.resolved } : item));
  }, [notifications]);

  const markAllRead = useCallback(async () => {
    const unread = notifications.filter(item => !item.read);
    await Promise.all(unread.map(item => fetch('/api/notifications', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id:item.id, action:'read', href:item.href }) }).then(response => { if (!response.ok) throw new Error('Notification could not be updated.'); })));
    setNotifications(current => current.map(item => ({ ...item, read:true })));
  }, [notifications]);

  const addNotification = useCallback((notification: WorkerNotification) => {
    setNotifications(current => [notification, ...current.filter(item => item.id !== notification.id)]);
  }, []);

  const value = useMemo(() => ({ notifications, unreadCount:notifications.filter(item => !item.read && !item.resolved).length, actionCount:notifications.filter(item => item.requiresAction && !item.resolved).length, loading, updateNotification, markAllRead, addNotification }), [notifications, loading, updateNotification, markAllRead, addNotification]);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error('useNotifications must be used inside NotificationProvider');
  return value;
}
