/**
 * Notification Store
 * Manages in-app notifications with persistence
 */

import { create } from 'zustand';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  timestamp: Date;
  href?: string; // Optional link to navigate to
}

type NotificationState = {
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;
  
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  togglePanel: () => void;
  closePanel: () => void;
};

const STORAGE_KEY = 'singularity-notifications';

function loadNotifications(): Notification[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return getDefaultNotifications();
    const parsed = JSON.parse(stored);
    return parsed.map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) }));
  } catch {
    return getDefaultNotifications();
  }
}

function saveNotifications(notifications: Notification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    // Storage full or unavailable
  }
}

function getDefaultNotifications(): Notification[] {
  return [
    {
      id: 'welcome-1',
      type: 'info',
      title: 'Welcome to Singularity',
      message: 'Your autonomous enterprise platform is ready. Explore the modules to get started.',
      read: false,
      timestamp: new Date(),
    },
    {
      id: 'system-1',
      type: 'success',
      title: 'System Online',
      message: 'All services are operational. Backend API, database, and AI runtime connected.',
      read: false,
      timestamp: new Date(Date.now() - 60000),
    },
  ];
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: loadNotifications(),
  unreadCount: loadNotifications().filter(n => !n.read).length,
  isOpen: false,

  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      read: false,
      timestamp: new Date(),
    };
    
    set((state) => {
      const updated = [newNotification, ...state.notifications].slice(0, 50); // Keep max 50
      saveNotifications(updated);
      return {
        notifications: updated,
        unreadCount: updated.filter(n => !n.read).length,
      };
    });
  },

  markAsRead: (id) => {
    set((state) => {
      const updated = state.notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      );
      saveNotifications(updated);
      return {
        notifications: updated,
        unreadCount: updated.filter(n => !n.read).length,
      };
    });
  },

  markAllAsRead: () => {
    set((state) => {
      const updated = state.notifications.map(n => ({ ...n, read: true }));
      saveNotifications(updated);
      return { notifications: updated, unreadCount: 0 };
    });
  },

  removeNotification: (id) => {
    set((state) => {
      const updated = state.notifications.filter(n => n.id !== id);
      saveNotifications(updated);
      return {
        notifications: updated,
        unreadCount: updated.filter(n => !n.read).length,
      };
    });
  },

  clearAll: () => {
    saveNotifications([]);
    set({ notifications: [], unreadCount: 0 });
  },

  togglePanel: () => set((state) => ({ isOpen: !state.isOpen })),
  closePanel: () => set({ isOpen: false }),
}));
