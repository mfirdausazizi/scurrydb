/**
 * Sync Store
 * 
 * Zustand store for managing Data Synchronizer state including:
 * - Comparison panels (up to 4)
 * - View mode (tab vs split)
 * - Scroll lock mode
 * - Sync queue
 * - Active panel for tab view
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ComparisonPanel,
  SyncQueueItem,
  ScrollLockMode,
  ViewMode,
  RowDiff,
} from '@/types/sync';

const MAX_PANELS = 4;
const MIN_PANELS = 2;

interface SyncState {
  // Panel management
  panels: ComparisonPanel[];
  activePanelId: string | null; // For tab view
  
  // View settings
  viewMode: ViewMode;
  scrollLockMode: ScrollLockMode;
  
  // Sync queue (selected rows to sync)
  syncQueue: SyncQueueItem[];
  
  // Comparison results cache
  comparisonResults: Map<string, RowDiff[]>;
  
  // Actions - Panel management
  addPanel: () => void;
  removePanel: (id: string) => void;
  updatePanel: (id: string, updates: Partial<Omit<ComparisonPanel, 'id'>>) => void;
  setActivePanel: (id: string) => void;
  reorderPanels: (fromIndex: number, toIndex: number) => void;
  
  // Actions - View settings
  setViewMode: (mode: ViewMode) => void;
  setScrollLockMode: (mode: ScrollLockMode) => void;
  
  // Actions - Row selection
  toggleRowSelection: (panelId: string, rowKey: string) => void;
  selectAllRows: (panelId: string, rowKeys: string[]) => void;
  clearPanelSelection: (panelId: string) => void;
  clearAllSelections: () => void;
  
  // Actions - Sync queue
  addToSyncQueue: (item: Omit<SyncQueueItem, 'id'>) => void;
  removeFromSyncQueue: (id: string) => void;
  clearSyncQueue: () => void;
  
  // Actions - Comparison results
  setComparisonResults: (key: string, results: RowDiff[]) => void;
  clearComparisonResults: () => void;
  
  // Actions - Utility
  resetStore: () => void;
}

const createDefaultPanel = (index: number): ComparisonPanel => ({
  id: `panel-${Date.now()}-${index}`,
  connectionId: null,
  connectionName: '',
  connectionType: null,
  tableName: null,
  scrollPosition: 0,
  selectedRowKeys: new Set(),
});

const initialState = {
  panels: [createDefaultPanel(0), createDefaultPanel(1)],
  activePanelId: null,
  viewMode: 'tab' as ViewMode,
  scrollLockMode: 'off' as ScrollLockMode,
  syncQueue: [] as SyncQueueItem[],
  comparisonResults: new Map<string, RowDiff[]>(),
};

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Panel management
      addPanel: () => {
        const { panels } = get();
        if (panels.length >= MAX_PANELS) return;
        
        set({
          panels: [...panels, createDefaultPanel(panels.length)],
        });
      },

      removePanel: (id) => {
        const { panels, activePanelId } = get();
        if (panels.length <= MIN_PANELS) return;
        
        const newPanels = panels.filter((p) => p.id !== id);
        const newActivePanelId = activePanelId === id 
          ? newPanels[0]?.id ?? null 
          : activePanelId;
        
        set({
          panels: newPanels,
          activePanelId: newActivePanelId,
        });
      },

      updatePanel: (id, updates) => {
        set((state) => ({
          panels: state.panels.map((panel) =>
            panel.id === id ? { ...panel, ...updates } : panel
          ),
        }));
      },

      setActivePanel: (id) => {
        set({ activePanelId: id });
      },

      reorderPanels: (fromIndex, toIndex) => {
        const { panels } = get();
        const newPanels = [...panels];
        const [removed] = newPanels.splice(fromIndex, 1);
        newPanels.splice(toIndex, 0, removed);
        set({ panels: newPanels });
      },

      // View settings
      setViewMode: (mode) => {
        set({ viewMode: mode });
      },

      setScrollLockMode: (mode) => {
        set({ scrollLockMode: mode });
      },

      // Row selection
      toggleRowSelection: (panelId, rowKey) => {
        set((state) => ({
          panels: state.panels.map((panel) => {
            if (panel.id !== panelId) return panel;
            
            const newSelectedRowKeys = new Set(panel.selectedRowKeys);
            if (newSelectedRowKeys.has(rowKey)) {
              newSelectedRowKeys.delete(rowKey);
            } else {
              newSelectedRowKeys.add(rowKey);
            }
            
            return { ...panel, selectedRowKeys: newSelectedRowKeys };
          }),
        }));
      },

      selectAllRows: (panelId, rowKeys) => {
        set((state) => ({
          panels: state.panels.map((panel) => {
            if (panel.id !== panelId) return panel;
            return { ...panel, selectedRowKeys: new Set(rowKeys) };
          }),
        }));
      },

      clearPanelSelection: (panelId) => {
        set((state) => ({
          panels: state.panels.map((panel) => {
            if (panel.id !== panelId) return panel;
            return { ...panel, selectedRowKeys: new Set() };
          }),
        }));
      },

      clearAllSelections: () => {
        set((state) => ({
          panels: state.panels.map((panel) => ({
            ...panel,
            selectedRowKeys: new Set(),
          })),
        }));
      },

      // Sync queue
      addToSyncQueue: (item) => {
        const id = `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        set((state) => ({
          syncQueue: [...state.syncQueue, { ...item, id }],
        }));
      },

      removeFromSyncQueue: (id) => {
        set((state) => ({
          syncQueue: state.syncQueue.filter((item) => item.id !== id),
        }));
      },

      clearSyncQueue: () => {
        set({ syncQueue: [] });
      },

      // Comparison results
      setComparisonResults: (key, results) => {
        set((state) => {
          const newResults = new Map(state.comparisonResults);
          newResults.set(key, results);
          return { comparisonResults: newResults };
        });
      },

      clearComparisonResults: () => {
        set({ comparisonResults: new Map() });
      },

      // Utility
      resetStore: () => {
        set({
          ...initialState,
          panels: [createDefaultPanel(0), createDefaultPanel(1)],
          comparisonResults: new Map(),
        });
      },
    }),
    {
      name: 'scurrydb-sync',
      partialize: (state) => ({
        viewMode: state.viewMode,
        scrollLockMode: state.scrollLockMode,
        // Don't persist panels, syncQueue, or comparisonResults
        // They should be fresh on each session
      }),
      // Custom storage to handle SSR and restore defaults
      storage: {
        getItem: (name) => {
          if (typeof window === 'undefined') return null;
          try {
            const str = localStorage.getItem(name);
            if (!str) return null;
            const data = JSON.parse(str);
            return {
              state: {
                ...data.state,
                // Restore defaults for non-persisted state
                panels: [createDefaultPanel(0), createDefaultPanel(1)],
                activePanelId: null,
                syncQueue: [],
                comparisonResults: new Map(),
              },
              version: data.version,
            };
          } catch {
            return null;
          }
        },
        setItem: (name, value) => {
          if (typeof window === 'undefined') return;
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch {
            // Ignore storage errors
          }
        },
        removeItem: (name) => {
          if (typeof window === 'undefined') return;
          try {
            localStorage.removeItem(name);
          } catch {
            // Ignore storage errors
          }
        },
      },
      skipHydration: true, // Skip automatic hydration to avoid SSR issues
    }
  )
);

// Helper to generate comparison key
export function getComparisonKey(
  sourceConnectionId: string,
  targetConnectionId: string,
  tableName: string
): string {
  return `${sourceConnectionId}:${targetConnectionId}:${tableName}`;
}

// Helper to serialize primary key for Set/Map operations
export function serializePrimaryKey(pk: Record<string, unknown>): string {
  return JSON.stringify(
    Object.entries(pk)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, v])
  );
}

// Helper to deserialize primary key
export function deserializePrimaryKey(pkString: string): Record<string, unknown> {
  return Object.fromEntries(JSON.parse(pkString));
}
