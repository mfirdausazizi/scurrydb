import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { QueryResult } from '@/types';

export interface EditorTab {
  id: string;
  title: string;
  sql: string;
  connectionId: string | null;
  isDirty: boolean;
  savedSql: string; // Track original to detect dirty state
  result: QueryResult | null;
  lastExecutedAt: Date | null;
}

interface EditorTabsState {
  tabs: EditorTab[];
  activeTabId: string | null;
  tabCounter: number; // For generating sequential tab names
  
  // Actions
  createTab: (connectionId?: string | null, sql?: string) => string;
  closeTab: (tabId: string, force?: boolean) => boolean; // returns false if unsaved and not forced
  switchTab: (tabId: string) => void;
  updateTabSql: (tabId: string, sql: string) => void;
  updateTabResult: (tabId: string, result: QueryResult | null) => void;
  updateTabConnection: (tabId: string, connectionId: string | null) => void;
  renameTab: (tabId: string, title: string) => void;
  markTabSaved: (tabId: string) => void;
  duplicateTab: (tabId: string) => string;
  closeOtherTabs: (tabId: string) => string[]; // returns IDs of closed tabs
  closeAllTabs: () => string[]; // returns IDs of closed tabs
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  getActiveTab: () => EditorTab | null;
  hasUnsavedTabs: () => boolean;
  getUnsavedTabs: () => EditorTab[];
  nextTab: () => void;
  previousTab: () => void;
  goToTab: (index: number) => void;
}

const DEFAULT_SQL = 'SELECT * FROM ';

function generateTabId(): string {
  return crypto.randomUUID();
}

function createNewTab(
  tabNumber: number,
  connectionId: string | null = null,
  sql: string = DEFAULT_SQL
): EditorTab {
  return {
    id: generateTabId(),
    title: `Query ${tabNumber}`,
    sql,
    savedSql: sql,
    connectionId,
    isDirty: false,
    result: null,
    lastExecutedAt: null,
  };
}

export const useEditorTabsStore = create<EditorTabsState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,
      tabCounter: 0,

      createTab: (connectionId = null, sql = DEFAULT_SQL) => {
        const { tabs, tabCounter } = get();
        const newTabNumber = tabCounter + 1;
        const newTab = createNewTab(newTabNumber, connectionId, sql);
        
        set({
          tabs: [...tabs, newTab],
          activeTabId: newTab.id,
          tabCounter: newTabNumber,
        });
        
        return newTab.id;
      },

      closeTab: (tabId, force = false) => {
        const { tabs, activeTabId } = get();
        const tabIndex = tabs.findIndex(t => t.id === tabId);
        
        if (tabIndex === -1) return true;
        
        const tab = tabs[tabIndex];
        
        // Check if unsaved and not forced
        if (tab.isDirty && !force) {
          return false;
        }
        
        const newTabs = tabs.filter(t => t.id !== tabId);
        
        // If closing the active tab, switch to another tab
        let newActiveId = activeTabId;
        if (activeTabId === tabId) {
          if (newTabs.length === 0) {
            // Create a new tab if all tabs are closed
            const { tabCounter } = get();
            const newTab = createNewTab(tabCounter + 1);
            newTabs.push(newTab);
            newActiveId = newTab.id;
            set({ tabCounter: tabCounter + 1 });
          } else {
            // Switch to adjacent tab
            const newIndex = Math.min(tabIndex, newTabs.length - 1);
            newActiveId = newTabs[newIndex].id;
          }
        }
        
        set({
          tabs: newTabs,
          activeTabId: newActiveId,
        });
        
        return true;
      },

      switchTab: (tabId) => {
        const { tabs } = get();
        if (tabs.some(t => t.id === tabId)) {
          set({ activeTabId: tabId });
        }
      },

      updateTabSql: (tabId, sql) => {
        set((state) => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId
              ? { 
                  ...tab, 
                  sql, 
                  isDirty: sql !== tab.savedSql,
                }
              : tab
          ),
        }));
      },

      updateTabResult: (tabId, result) => {
        set((state) => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId
              ? { 
                  ...tab, 
                  result,
                  lastExecutedAt: result ? new Date() : tab.lastExecutedAt,
                }
              : tab
          ),
        }));
      },

      updateTabConnection: (tabId, connectionId) => {
        set((state) => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId ? { ...tab, connectionId } : tab
          ),
        }));
      },

      renameTab: (tabId, title) => {
        if (!title.trim()) return;
        set((state) => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId ? { ...tab, title: title.trim() } : tab
          ),
        }));
      },

      markTabSaved: (tabId) => {
        set((state) => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId
              ? { ...tab, savedSql: tab.sql, isDirty: false }
              : tab
          ),
        }));
      },

      duplicateTab: (tabId) => {
        const { tabs, tabCounter } = get();
        const sourceTab = tabs.find(t => t.id === tabId);
        
        if (!sourceTab) return '';
        
        const newTabNumber = tabCounter + 1;
        const newTab: EditorTab = {
          ...sourceTab,
          id: generateTabId(),
          title: `${sourceTab.title} (copy)`,
          isDirty: false,
          savedSql: sourceTab.sql,
          result: null,
          lastExecutedAt: null,
        };
        
        // Insert after the source tab
        const sourceIndex = tabs.findIndex(t => t.id === tabId);
        const newTabs = [...tabs];
        newTabs.splice(sourceIndex + 1, 0, newTab);
        
        set({
          tabs: newTabs,
          activeTabId: newTab.id,
          tabCounter: newTabNumber,
        });
        
        return newTab.id;
      },

      closeOtherTabs: (tabId) => {
        const { tabs } = get();
        const closedIds: string[] = [];
        
        // Close all other tabs (forced)
        tabs.forEach(tab => {
          if (tab.id !== tabId) {
            closedIds.push(tab.id);
          }
        });
        
        set({
          tabs: tabs.filter(t => t.id === tabId),
          activeTabId: tabId,
        });
        
        return closedIds;
      },

      closeAllTabs: () => {
        const { tabs, tabCounter } = get();
        const closedIds = tabs.map(t => t.id);
        
        // Create a new default tab
        const newTab = createNewTab(tabCounter + 1);
        
        set({
          tabs: [newTab],
          activeTabId: newTab.id,
          tabCounter: tabCounter + 1,
        });
        
        return closedIds;
      },

      reorderTabs: (fromIndex, toIndex) => {
        set((state) => {
          const newTabs = [...state.tabs];
          const [movedTab] = newTabs.splice(fromIndex, 1);
          newTabs.splice(toIndex, 0, movedTab);
          return { tabs: newTabs };
        });
      },

      getActiveTab: () => {
        const { tabs, activeTabId } = get();
        return tabs.find(t => t.id === activeTabId) || null;
      },

      hasUnsavedTabs: () => {
        const { tabs } = get();
        return tabs.some(t => t.isDirty);
      },

      getUnsavedTabs: () => {
        const { tabs } = get();
        return tabs.filter(t => t.isDirty);
      },

      nextTab: () => {
        const { tabs, activeTabId } = get();
        if (tabs.length <= 1) return;
        
        const currentIndex = tabs.findIndex(t => t.id === activeTabId);
        const nextIndex = (currentIndex + 1) % tabs.length;
        set({ activeTabId: tabs[nextIndex].id });
      },

      previousTab: () => {
        const { tabs, activeTabId } = get();
        if (tabs.length <= 1) return;
        
        const currentIndex = tabs.findIndex(t => t.id === activeTabId);
        const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        set({ activeTabId: tabs[prevIndex].id });
      },

      goToTab: (index) => {
        const { tabs } = get();
        if (index >= 0 && index < tabs.length) {
          set({ activeTabId: tabs[index].id });
        }
      },
    }),
    {
      name: 'scurrydb-editor-tabs',
      partialize: (state) => ({
        // Persist tabs but not results (they can be large)
        tabs: state.tabs.map(tab => ({
          ...tab,
          result: null, // Don't persist query results
        })),
        activeTabId: state.activeTabId,
        tabCounter: state.tabCounter,
      }),
      // Initialize with at least one tab on hydration
      onRehydrateStorage: () => (state) => {
        if (state && state.tabs.length === 0) {
          const newTab = createNewTab(1);
          state.tabs = [newTab];
          state.activeTabId = newTab.id;
          state.tabCounter = 1;
        }
      },
    }
  )
);

// Initialize store with at least one tab if empty (for SSR/initial load)
if (typeof window !== 'undefined') {
  const state = useEditorTabsStore.getState();
  if (state.tabs.length === 0) {
    state.createTab();
  }
}
