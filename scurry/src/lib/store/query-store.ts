import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { QueryHistoryItem } from '@/types';

const MAX_HISTORY_ITEMS = 100;

interface QueryState {
  history: QueryHistoryItem[];
  currentQuery: string;
  selectedConnectionId: string | null;
  selectedWorkspaceId: string | null; // Track which workspace the selected connection belongs to

  setCurrentQuery: (query: string) => void;
  setSelectedConnectionId: (id: string | null, workspaceId?: string | null) => void;
  addToHistory: (item: Omit<QueryHistoryItem, 'id'>) => void;
  clearHistory: () => void;
  resetForWorkspaceChange: () => void;
}

export const useQueryStore = create<QueryState>()(
  persist(
    (set) => ({
      history: [],
      currentQuery: 'SELECT * FROM ',
      selectedConnectionId: null,
      selectedWorkspaceId: null,

      setCurrentQuery: (query) => set({ currentQuery: query }),

      setSelectedConnectionId: (id, workspaceId = null) => set({ 
        selectedConnectionId: id,
        selectedWorkspaceId: workspaceId,
      }),

      addToHistory: (item) =>
        set((state) => {
          const newItem: QueryHistoryItem = {
            ...item,
            id: crypto.randomUUID(),
          };
          const newHistory = [newItem, ...state.history].slice(0, MAX_HISTORY_ITEMS);
          return { history: newHistory };
        }),

      clearHistory: () => set({ history: [] }),

      resetForWorkspaceChange: () => set({
        selectedConnectionId: null,
        selectedWorkspaceId: null,
        // Keep history and currentQuery - they might still be useful
      }),
    }),
    {
      name: 'scurrydb-query-history',
      partialize: (state) => ({
        history: state.history,
        // Don't persist selectedConnectionId - it should be reset on workspace change
      }),
    }
  )
);
