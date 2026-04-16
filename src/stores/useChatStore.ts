import { create } from 'zustand';
import { supabase } from '@/lib/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Message } from '@/types';

interface ChatState {
  activeChatUserId: string | null;
  channels: Map<string, RealtimeChannel>;
  setActiveChatUser: (userId: string | null) => void;
  joinChat: (currentUserId: string, otherUserId: string, onMessage: (msg: Message) => void) => void;
  leaveChat: (currentUserId: string, otherUserId: string) => void;
  sendMessage: (currentUserId: string, otherUserId: string, message: Message) => void;
  cleanup: () => void;
}

function channelKey(a: string, b: string) {
  return `chat:${[a, b].sort().join(':')}`;
}

export const useChatStore = create<ChatState>((set, get) => ({
  activeChatUserId: null,
  channels: new Map(),

  setActiveChatUser: (userId) => set({ activeChatUserId: userId }),

  joinChat: (currentUserId, otherUserId, onMessage) => {
    const key = channelKey(currentUserId, otherUserId);
    const existing = get().channels.get(key);
    if (existing) return; // already joined

    const channel = supabase.channel(key, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'new-message' }, ({ payload }) => {
        const msg = payload as Message;
        if (msg.sender_id === otherUserId && msg.receiver_id === currentUserId) {
          onMessage(msg);
        }
      })
      .subscribe();

    const channels = new Map(get().channels);
    channels.set(key, channel);
    set({ channels });
  },

  leaveChat: (currentUserId, otherUserId) => {
    const key = channelKey(currentUserId, otherUserId);
    const channel = get().channels.get(key);
    if (channel) {
      supabase.removeChannel(channel);
      const channels = new Map(get().channels);
      channels.delete(key);
      set({ channels });
    }
  },

  sendMessage: (_currentUserId, _otherUserId, message) => {
    const key = channelKey(message.sender_id, message.receiver_id);
    const channel = get().channels.get(key);
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'new-message',
        payload: message,
      });
    }
  },

  cleanup: () => {
    const channels = get().channels;
    channels.forEach(ch => supabase.removeChannel(ch));
    set({ channels: new Map(), activeChatUserId: null });
  },
}));
