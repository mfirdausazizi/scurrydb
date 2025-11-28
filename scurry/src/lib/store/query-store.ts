import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { QueryHistoryItem } from '@/types';

const MAX_HISTORY_ITEMS = 100;

interface QueryState {
  history: QueryHistoryItem[];
  currentQuery: string;
  selectedConnectionId: string | null;

  setCurrentQuery: (query: string) => void;
  setSelectedConnectionId: (id: string | null) => void;
  addToHistory: (item: Omit<QueryHistoryItem, 'id'>) => void;
  clearHistory: () => void;
}

export const useQueryStore = create<QueryState>()(
  persist(
    (set) => ({
      history: [],
      currentQuery: 'SELECT * FROM ',
      selectedConnectionId: null,

      setCurrentQuery: (query) => set({ currentQuery: query }),

      setSelectedConnectionId: (id) => set({ selectedConnectionId: id }),

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
    }),
    {
      name: 'scurrydb-query-history',
      partialize: (state) => ({
        history: state.history,
        selectedConnectionId: state.selectedConnectionId,
      }),
    }
  )
);
