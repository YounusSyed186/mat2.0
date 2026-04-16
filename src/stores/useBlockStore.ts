import { create } from 'zustand';
import { supabase } from '@/lib/supabaseClient';
import type { UserBlock } from '@/types';

interface BlockStore {
  blocks: UserBlock[];
  loading: boolean;
  fetchBlocks: (userId: string) => Promise<void>;
  blockUser: (blockerId: string, blockedId: string) => Promise<boolean>;
  unblockUser: (blockerId: string, blockedId: string) => Promise<boolean>;
  isBlocked: (userId: string) => boolean;
  isBlockedBy: (userId: string) => boolean;
  isBlockRelation: (userId: string) => boolean;
  currentUserId: string | null;
}

export const useBlockStore = create<BlockStore>((set, get) => ({
  blocks: [],
  loading: false,
  currentUserId: null,

  fetchBlocks: async (userId: string) => {
    set({ loading: true, currentUserId: userId });
    const { data, error } = await supabase
      .from('user_blocks')
      .select('*')
      .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);

    if (!error && data) {
      set({ blocks: data as UserBlock[] });
    }
    set({ loading: false });
  },

  blockUser: async (blockerId: string, blockedId: string) => {
    const { error } = await supabase
      .from('user_blocks')
      .insert({ blocker_id: blockerId, blocked_id: blockedId });

    if (error) return false;

    // Refetch blocks
    await get().fetchBlocks(blockerId);
    return true;
  },

  unblockUser: async (blockerId: string, blockedId: string) => {
    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId);

    if (error) return false;

    await get().fetchBlocks(blockerId);
    return true;
  },

  // Did the current user block this userId?
  isBlocked: (userId: string) => {
    const { blocks, currentUserId } = get();
    return blocks.some(b => b.blocker_id === currentUserId && b.blocked_id === userId);
  },

  // Did userId block the current user?
  isBlockedBy: (userId: string) => {
    const { blocks, currentUserId } = get();
    return blocks.some(b => b.blocker_id === userId && b.blocked_id === currentUserId);
  },

  // Is there any block relationship between current user and userId?
  isBlockRelation: (userId: string) => {
    const { blocks, currentUserId } = get();
    return blocks.some(
      b =>
        (b.blocker_id === currentUserId && b.blocked_id === userId) ||
        (b.blocker_id === userId && b.blocked_id === currentUserId)
    );
  },
}));
