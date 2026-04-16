import { create } from 'zustand';
import { supabase } from '@/lib/supabaseClient';
import type { Notification } from '@/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  channel: RealtimeChannel | null;
  fetchNotifications: (userId: string) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  addNotification: (notification: Notification) => void;
  createNotification: (userId: string, type: Notification['type'], referenceId?: string, metadata?: string) => Promise<void>;
  subscribeToNotifications: (userId: string) => void;
  unsubscribe: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  channel: null,

  fetchNotifications: async (userId: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        const notifs = data as Notification[];
        set({
          notifications: notifs,
          unreadCount: notifs.filter(n => !n.is_read).length,
        });
      }
    } catch {
      // Table may not exist yet
    }
    set({ loading: false });
  },

  markAsRead: async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    set(state => {
      const updated = state.notifications.map(n =>
        n.id === notificationId ? { ...n, is_read: true } : n
      );
      return {
        notifications: updated,
        unreadCount: updated.filter(n => !n.is_read).length,
      };
    });
  },

  markAllAsRead: async (userId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, is_read: true })),
      unreadCount: 0,
    }));
  },

  addNotification: (notification: Notification) => {
    set(state => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.is_read ? 0 : 1),
    }));
  },

  createNotification: async (userId: string, type: Notification['type'], referenceId?: string, metadata?: string) => {
    try {
      await supabase.from('notifications').insert({
        user_id: userId,
        type,
        reference_id: referenceId || null,
        is_read: false,
        metadata: metadata || null,
      });
    } catch {
      // Table may not exist yet
    }
  },

  subscribeToNotifications: (userId: string) => {
    const existing = get().channel;
    if (existing) {
      supabase.removeChannel(existing);
    }

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          get().addNotification(newNotif);
        }
      )
      .subscribe();

    set({ channel });
  },

  unsubscribe: () => {
    const { channel } = get();
    if (channel) {
      supabase.removeChannel(channel);
      set({ channel: null });
    }
  },
}));
