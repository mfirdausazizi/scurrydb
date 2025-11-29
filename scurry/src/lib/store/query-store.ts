import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { QueryHistoryItem, QueryResult } from '@/types';

const MAX_HISTORY_ITEMS = 100;

// PERF-009: Query result cache configuration
const MAX_CACHED_RESULTS = 10;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachedQueryResult {
  result: QueryResult;
  timestamp: number;
  connectionId: string;
  query: string;
}

interface QueryState {
  history: QueryHistoryItem[];
  currentQuery: string;
  selectedConnectionId: string | null;
  selectedWorkspaceId: string | null; // Track which workspace the selected connection belongs to
  
  // PERF-009: Query result cache (not persisted)
  resultCache: Map<string, CachedQueryResult>;

  setCurrentQuery: (query: string) => void;
  setSelectedConnectionId: (id: string | null, workspaceId?: string | null) => void;
  addToHistory: (item: Omit<QueryHistoryItem, 'id'>) => void;
  clearHistory: () => void;
  resetForWorkspaceChange: () => void;
  
  // PERF-009: Cache methods
  getCachedResult: (connectionId: string, query: string) => QueryResult | null;
  setCachedResult: (connectionId: string, query: string, result: QueryResult) => void;
  clearCache: () => void;
}

// PERF-009: Helper to create cache key
function createCacheKey(connectionId: string, query: string): string {
  // Normalize query by trimming and collapsing whitespace
  const normalizedQuery = query.trim().replace(/\s+/g, ' ').toLowerCase();
  return `${connectionId}:${normalizedQuery}`;
}

export const useQueryStore = create<QueryState>()(
  persist(
    (set, get) => ({
      history: [],
      currentQuery: 'SELECT * FROM ',
      selectedConnectionId: null,
      selectedWorkspaceId: null,
      resultCache: new Map(),

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
      
      // PERF-009: Query result caching
      getCachedResult: (connectionId: string, query: string) => {
        const cacheKey = createCacheKey(connectionId, query);
        const cached = get().resultCache.get(cacheKey);
        
        if (!cached) return null;
        
        // Check if cache is expired
        if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
          // Remove expired entry
          const newCache = new Map(get().resultCache);
          newCache.delete(cacheKey);
          set({ resultCache: newCache });
          return null;
        }
        
        return cached.result;
      },
      
      setCachedResult: (connectionId: string, query: string, result: QueryResult) => {
        // Don't cache error results or results with 0 rows (might be transient)
        if (result.error || result.rows.length === 0) return;
        
        const cacheKey = createCacheKey(connectionId, query);
        const newCache = new Map(get().resultCache);
        
        // If cache is full, remove oldest entry
        if (newCache.size >= MAX_CACHED_RESULTS) {
          let oldestKey: string | null = null;
          let oldestTimestamp = Infinity;
          
          for (const [key, entry] of newCache) {
            if (entry.timestamp < oldestTimestamp) {
              oldestTimestamp = entry.timestamp;
              oldestKey = key;
            }
          }
          
          if (oldestKey) {
            newCache.delete(oldestKey);
          }
        }
        
        newCache.set(cacheKey, {
          result,
          timestamp: Date.now(),
          connectionId,
          query,
        });
        
        set({ resultCache: newCache });
      },
      
      clearCache: () => set({ resultCache: new Map() }),
    }),
    {
      name: 'scurrydb-query-history',
      partialize: (state) => ({
        history: state.history,
        // Don't persist selectedConnectionId or resultCache
      }),
    }
  )
);
