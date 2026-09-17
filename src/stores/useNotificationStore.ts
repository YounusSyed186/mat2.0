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
    if (!userId) return;
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
      } else if (data) {
        let notifs = (data as Notification[]) || [];

        // Check if there are any pending received interests missing a notification
        const { data: pendingInterests } = await supabase
          .from('interests')
          .select('id, sender_id, created_at')
          .eq('receiver_id', userId)
          .eq('status', 'pending');

        if (pendingInterests && pendingInterests.length > 0) {
          const existingSenderIds = new Set(
            notifs
              .filter(n => n.type === 'interest_received')
              .map(n => n.reference_id)
          );

          for (const pi of pendingInterests) {
            if (!existingSenderIds.has(pi.sender_id)) {
              // Create missing notification row in Supabase
              const newNotifPayload = {
                user_id: userId,
                type: 'interest_received' as const,
                reference_id: pi.sender_id,
                is_read: false,
                metadata: 'Someone',
              };

              const { error: insErr } = await supabase
                .from('notifications')
                .insert(newNotifPayload);

              if (!insErr) {
                // Re-query or synthesize local notification
                const syntheticNotif: Notification = {
                  id: `synced-${pi.id}`,
                  user_id: userId,
                  type: 'interest_received',
                  reference_id: pi.sender_id,
                  is_read: false,
                  metadata: 'Someone',
                  created_at: pi.created_at || new Date().toISOString(),
                };
                notifs.unshift(syntheticNotif);
              }
            }
          }
        }

        // Collect all distinct sender IDs from reference_id
        const senderIds = Array.from(new Set(notifs.map(n => n.reference_id).filter(Boolean))) as string[];
        let profilesMap: Record<string, { name: string; avatar_url?: string }> = {};

        if (senderIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, name, avatar_url')
            .in('id', senderIds);

          if (profilesData) {
            profilesMap = Object.fromEntries(profilesData.map(p => [p.id, p]));
          }
        }

        const enrichedNotifs = notifs.map(n => {
          let resolvedName = '';
          if (n.reference_id && profilesMap[n.reference_id]) {
            resolvedName = profilesMap[n.reference_id].name;
          }

          if (!resolvedName && n.metadata) {
            try {
              if (n.metadata.trim().startsWith('{')) {
                const parsed = JSON.parse(n.metadata);
                resolvedName = parsed.sender_name || parsed.name || '';
              } else {
                resolvedName = n.metadata;
              }
            } catch {
              resolvedName = n.metadata;
            }
          }

          return {
            ...n,
            sender_name: resolvedName || 'Someone',
            sender_avatar: n.reference_id ? profilesMap[n.reference_id]?.avatar_url : undefined,
          };
        });

        set({
          notifications: enrichedNotifs,
          unreadCount: enrichedNotifs.filter(n => !n.is_read).length,
        });
      }
    } catch (err) {
      console.error('Exception fetching notifications:', err);
    } finally {
      set({ loading: false });
    }
  },

  markAsRead: async (notificationId: string) => {
    set(state => {
      const updated = state.notifications.map(n =>
        n.id === notificationId ? { ...n, is_read: true } : n
      );
      return {
        notifications: updated,
        unreadCount: updated.filter(n => !n.is_read).length,
      };
    });

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
      }
    } catch (err) {
      console.error('Exception marking notification as read:', err);
    }
  },

  markAllAsRead: async (userId: string) => {
    if (!userId) return;
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, is_read: true })),
      unreadCount: 0,
    }));

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
      }
    } catch (err) {
      console.error('Exception marking all notifications as read:', err);
    }
  },

  addNotification: (notification: Notification) => {
    set(state => {
      if (state.notifications.some(n => n.id === notification.id)) {
        return state;
      }
      const updated = [notification, ...state.notifications];
      return {
        notifications: updated,
        unreadCount: updated.filter(n => !n.is_read).length,
      };
    });
  },

  createNotification: async (userId: string, type: Notification['type'], referenceId?: string, metadata?: string) => {
    if (!userId) return;

    const payload = {
      user_id: userId,
      type,
      reference_id: referenceId || null,
      is_read: false,
      metadata: metadata || null,
    };

    try {
      const { error } = await supabase
        .from('notifications')
        .insert(payload);

      if (error) {
        console.error('Error creating notification in Supabase:', error);
      }
    } catch (err) {
      console.error('Exception in createNotification:', err);
    }
  },

  subscribeToNotifications: (userId: string) => {
    if (!userId) return;
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
        async (payload) => {
          const newNotif = payload.new as Notification;
          let senderName = newNotif.metadata || 'Someone';

          if (newNotif.reference_id) {
            const { data: prof } = await supabase
              .from('profiles')
              .select('name, avatar_url')
              .eq('id', newNotif.reference_id)
              .maybeSingle();

            if (prof?.name) {
              senderName = prof.name;
              newNotif.sender_avatar = prof.avatar_url;
            }
          }

          newNotif.sender_name = senderName;
          get().addNotification(newNotif);

          // Show toast pop for new notification
          import('sonner').then(({ toast }) => {
            let title = 'New Notification';
            if (newNotif.type === 'interest_received') title = `${senderName} sent you an interest!`;
            if (newNotif.type === 'interest_accepted') title = `${senderName} accepted your interest!`;
            if (newNotif.type === 'message') title = `New message from ${senderName}`;

            toast.success(title, {
              description: 'Check your notifications.',
              duration: 4000,
            });
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to notifications for user ${userId}`);
        }
      });

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
