export { useConnectionStore } from './connection-store';
export { useQueryStore } from './query-store';
export { useEditorTabsStore } from './editor-tabs-store';
export type { EditorTab } from './editor-tabs-store';
export { usePendingChangesStore, getStoreKey, emptyChanges } from './pending-changes-store';
export type { TablePendingChanges } from './pending-changes-store';

// PERF-009: Export optimized selectors
export {
  // Query store selectors
  selectHistory,
  selectCurrentQuery,
  selectSelectedConnectionId,
  selectSelectedWorkspaceId,
  selectSetCurrentQuery,
  selectSetSelectedConnectionId,
  selectAddToHistory,
  selectClearHistory,
  selectGetCachedResult,
  selectSetCachedResult,
  selectClearCache,
  useCurrentQuery,
  useSelectedConnection,
  useQueryHistory,
  useQueryResultCache,
  
  // Connection store selectors
  selectConnections,
  selectActiveConnectionId,
  selectSidebarOpen,
  selectSetActiveConnection,
  selectSetSidebarOpen,
  selectAddConnection,
  selectRemoveConnection,
  selectUpdateConnection,
  useActiveConnection,
  useSidebar,
  
  // Pending changes store selectors
  selectAllPendingChanges,
  selectSetChangesForTable,
  selectClearChangesForTable,
  selectClearAllChanges,
  createTableChangesSelector,
  selectTotalPendingChangesCount,
  useTablePendingChanges,
  
  // Workspace store selectors
  selectActiveTeamId,
  selectActiveTeam,
  selectSetActiveTeam,
  selectSetActiveTeamId,
  selectClearWorkspace,
  useActiveWorkspace,
  
  // Combined selectors
  useConnectionWithWorkspace,
} from './selectors';
