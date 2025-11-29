/**
 * Store Selectors
 * 
 * PERF-009: Optimized selectors for Zustand stores.
 * Using granular selectors prevents unnecessary re-renders when only
 * specific parts of the state change.
 * 
 * Usage:
 * // Instead of:
 * const { history, currentQuery, selectedConnectionId } = useQueryStore();
 * 
 * // Use individual selectors:
 * const history = useQueryStore(selectHistory);
 * const currentQuery = useQueryStore(selectCurrentQuery);
 * 
 * // Or use selector hooks:
 * const { currentQuery, setCurrentQuery } = useCurrentQuery();
 */

import { useShallow } from 'zustand/react/shallow';
import { useQueryStore } from './query-store';
import { useConnectionStore } from './connection-store';
import { usePendingChangesStore, getStoreKey } from './pending-changes-store';
import { useWorkspaceStore } from './workspace-store';

// ==================== Query Store Selectors ====================

// Individual state selectors
export const selectHistory = (state: ReturnType<typeof useQueryStore.getState>) => state.history;
export const selectCurrentQuery = (state: ReturnType<typeof useQueryStore.getState>) => state.currentQuery;
export const selectSelectedConnectionId = (state: ReturnType<typeof useQueryStore.getState>) => state.selectedConnectionId;
export const selectSelectedWorkspaceId = (state: ReturnType<typeof useQueryStore.getState>) => state.selectedWorkspaceId;

// Action selectors (these don't trigger re-renders)
export const selectSetCurrentQuery = (state: ReturnType<typeof useQueryStore.getState>) => state.setCurrentQuery;
export const selectSetSelectedConnectionId = (state: ReturnType<typeof useQueryStore.getState>) => state.setSelectedConnectionId;
export const selectAddToHistory = (state: ReturnType<typeof useQueryStore.getState>) => state.addToHistory;
export const selectClearHistory = (state: ReturnType<typeof useQueryStore.getState>) => state.clearHistory;

// PERF-009: Query result cache selectors
export const selectGetCachedResult = (state: ReturnType<typeof useQueryStore.getState>) => state.getCachedResult;
export const selectSetCachedResult = (state: ReturnType<typeof useQueryStore.getState>) => state.setCachedResult;
export const selectClearCache = (state: ReturnType<typeof useQueryStore.getState>) => state.clearCache;

// Composite selector hooks for common use cases
export function useCurrentQuery() {
  return useQueryStore(
    useShallow((state) => ({
      currentQuery: state.currentQuery,
      setCurrentQuery: state.setCurrentQuery,
    }))
  );
}

export function useSelectedConnection() {
  return useQueryStore(
    useShallow((state) => ({
      selectedConnectionId: state.selectedConnectionId,
      selectedWorkspaceId: state.selectedWorkspaceId,
      setSelectedConnectionId: state.setSelectedConnectionId,
    }))
  );
}

export function useQueryHistory() {
  return useQueryStore(
    useShallow((state) => ({
      history: state.history,
      addToHistory: state.addToHistory,
      clearHistory: state.clearHistory,
    }))
  );
}

// PERF-009: Hook for query result caching
export function useQueryResultCache() {
  return useQueryStore(
    useShallow((state) => ({
      getCachedResult: state.getCachedResult,
      setCachedResult: state.setCachedResult,
      clearCache: state.clearCache,
    }))
  );
}

// ==================== Connection Store Selectors ====================

export const selectConnections = (state: ReturnType<typeof useConnectionStore.getState>) => state.connections;
export const selectActiveConnectionId = (state: ReturnType<typeof useConnectionStore.getState>) => state.activeConnectionId;
export const selectSidebarOpen = (state: ReturnType<typeof useConnectionStore.getState>) => state.sidebarOpen;

export const selectSetActiveConnection = (state: ReturnType<typeof useConnectionStore.getState>) => state.setActiveConnection;
export const selectSetSidebarOpen = (state: ReturnType<typeof useConnectionStore.getState>) => state.setSidebarOpen;
export const selectAddConnection = (state: ReturnType<typeof useConnectionStore.getState>) => state.addConnection;
export const selectRemoveConnection = (state: ReturnType<typeof useConnectionStore.getState>) => state.removeConnection;
export const selectUpdateConnection = (state: ReturnType<typeof useConnectionStore.getState>) => state.updateConnection;

export function useActiveConnection() {
  return useConnectionStore(
    useShallow((state) => ({
      activeConnectionId: state.activeConnectionId,
      activeConnectionWorkspaceId: state.activeConnectionWorkspaceId,
      setActiveConnection: state.setActiveConnection,
      clearActiveConnection: state.clearActiveConnection,
    }))
  );
}

export function useSidebar() {
  return useConnectionStore(
    useShallow((state) => ({
      sidebarOpen: state.sidebarOpen,
      setSidebarOpen: state.setSidebarOpen,
    }))
  );
}

// ==================== Pending Changes Store Selectors ====================

export const selectAllPendingChanges = (state: ReturnType<typeof usePendingChangesStore.getState>) => state.pendingChanges;
export const selectSetChangesForTable = (state: ReturnType<typeof usePendingChangesStore.getState>) => state.setChangesForTable;
export const selectClearChangesForTable = (state: ReturnType<typeof usePendingChangesStore.getState>) => state.clearChangesForTable;
export const selectClearAllChanges = (state: ReturnType<typeof usePendingChangesStore.getState>) => state.clearAllChanges;

// Selector factory for specific table changes
export function createTableChangesSelector(connectionId: string, tableName: string) {
  const key = getStoreKey(connectionId, tableName);
  return (state: ReturnType<typeof usePendingChangesStore.getState>) => state.pendingChanges[key];
}

// Count total pending changes across all tables
export function selectTotalPendingChangesCount(state: ReturnType<typeof usePendingChangesStore.getState>) {
  let count = 0;
  for (const entry of Object.values(state.pendingChanges)) {
    count += entry.changes.updates.length + entry.changes.inserts.length + entry.changes.deletes.length;
  }
  return count;
}

// Hook for table-specific pending changes
export function useTablePendingChanges(connectionId: string | null, tableName: string | null) {
  const storeKey = connectionId && tableName ? getStoreKey(connectionId, tableName) : null;
  
  const tableChanges = usePendingChangesStore((state) => 
    storeKey ? state.pendingChanges[storeKey] : undefined
  );
  
  const setChangesForTable = usePendingChangesStore(selectSetChangesForTable);
  const clearChangesForTable = usePendingChangesStore(selectClearChangesForTable);
  
  return {
    tableChanges,
    setChangesForTable,
    clearChangesForTable,
  };
}

// ==================== Workspace Store Selectors ====================

export const selectActiveTeamId = (state: ReturnType<typeof useWorkspaceStore.getState>) => state.activeTeamId;
export const selectActiveTeam = (state: ReturnType<typeof useWorkspaceStore.getState>) => state.activeTeam;
export const selectSetActiveTeam = (state: ReturnType<typeof useWorkspaceStore.getState>) => state.setActiveTeam;
export const selectSetActiveTeamId = (state: ReturnType<typeof useWorkspaceStore.getState>) => state.setActiveTeamId;
export const selectClearWorkspace = (state: ReturnType<typeof useWorkspaceStore.getState>) => state.clearWorkspace;

export function useActiveWorkspace() {
  return useWorkspaceStore(
    useShallow((state) => ({
      activeTeamId: state.activeTeamId,
      activeTeam: state.activeTeam,
      setActiveTeam: state.setActiveTeam,
      setActiveTeamId: state.setActiveTeamId,
      clearWorkspace: state.clearWorkspace,
    }))
  );
}

// ==================== Combined Selectors ====================

/**
 * Hook to get the selected connection with its workspace context
 * Combines query store and connection store selectors
 */
export function useConnectionWithWorkspace() {
  const selectedConnectionId = useQueryStore(selectSelectedConnectionId);
  const selectedWorkspaceId = useQueryStore(selectSelectedWorkspaceId);
  const setSelectedConnectionId = useQueryStore(selectSetSelectedConnectionId);
  const connections = useConnectionStore(selectConnections);
  
  const selectedConnection = connections.find(c => c.id === selectedConnectionId) || null;
  
  return {
    selectedConnectionId,
    selectedWorkspaceId,
    selectedConnection,
    setSelectedConnectionId,
  };
}
