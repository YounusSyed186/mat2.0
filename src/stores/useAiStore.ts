import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile } from '@/types';

interface MatchResult extends Profile {
  similarity: number;
}

interface OptimizationResult {
  improved_bio: string;
  improved_profession: string;
  improved_hobbies: string[];
  improved_habits: string;
  improved_prompts: Record<string, string>;
  profile_score: number;
  tips: string[];
}

interface AiState {
  // AI Match persistence
  matchQuery: string;
  matchResults: MatchResult[];
  matchExplanation: string;
  matchPage: number;
  
  // Profile Optimizer persistence
  optimizationResult: OptimizationResult | null;
  optimizationDate: string | null;

  // Actions
  setMatchData: (query: string, results: MatchResult[], explanation: string, page: number) => void;
  setOptimizationData: (result: OptimizationResult) => void;
  clearMatchData: () => void;
  clearOptimizationData: () => void;
}

export const useAiStore = create<AiState>()(
  persist(
    (set) => ({
      matchQuery: "",
      matchResults: [],
      matchExplanation: "",
      matchPage: 1,
      
      optimizationResult: null,
      optimizationDate: null,

      setMatchData: (query, results, explanation, page) => 
        set({ matchQuery: query, matchResults: results, matchExplanation: explanation, matchPage: page }),
      
      setOptimizationData: (result) => 
        set({ optimizationResult: result, optimizationDate: new Date().toISOString() }),
      
      clearMatchData: () => 
        set({ matchQuery: "", matchResults: [], matchExplanation: "", matchPage: 1 }),
      
      clearOptimizationData: () => 
        set({ optimizationResult: null, optimizationDate: null }),
    }),
    {
      name: 'viva-ai-storage',
    }
  )
);
