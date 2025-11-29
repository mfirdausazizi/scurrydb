/**
 * Data Synchronizer Types
 * 
 * Types for the multi-table comparison and sync feature.
 */

export type SyncScope = 'selected' | 'table';
export type SyncContent = 'data' | 'structure' | 'both';

/**
 * Scroll lock modes for panel synchronization
 * - 'off': Panels operate independently
 * - 'table': Table selection syncs across all panels (same table name in each connection)
 * - 'row': Table selection AND scroll position sync across panels
 */
export type ScrollLockMode = 'off' | 'table' | 'row';

export type ViewMode = 'tab' | 'split';
export type RowDiffStatus = 'match' | 'different' | 'source-only' | 'target-only';

/**
 * Represents a single comparison panel in the Data Synchronizer
 */
export interface ComparisonPanel {
  id: string;
  connectionId: string | null;
  connectionName: string;
  connectionType: string | null; // mysql, postgresql, sqlite, mariadb
  tableName: string | null;
  scrollPosition: number;
  selectedRowKeys: Set<string>; // PK-based identification
}

/**
 * Cell-level difference between source and target
 */
export interface CellDiff {
  column: string;
  sourceValue: unknown;
  targetValue: unknown;
}

/**
 * Row-level difference information
 */
export interface RowDiff {
  primaryKey: Record<string, unknown>;
  primaryKeyString: string; // Serialized for easy lookup
  status: RowDiffStatus;
  cellDiffs: CellDiff[];
  sourceRow?: Record<string, unknown>;
  targetRow?: Record<string, unknown>;
}

/**
 * Result of comparing two tables
 */
export interface TableComparisonResult {
  sourcePanelId: string;
  targetPanelId: string;
  tableName: string;
  primaryKeyColumns: string[];
  totalSourceRows: number;
  totalTargetRows: number;
  matchingRows: number;
  differentRows: number;
  sourceOnlyRows: number;
  targetOnlyRows: number;
  diffs: RowDiff[];
}

/**
 * Configuration for a sync operation
 */
export interface SyncConfig {
  sourcePanelId: string;
  targetPanelId: string;
  sourceConnectionId: string;
  targetConnectionId: string;
  tableName: string;
  scope: SyncScope;
  content: SyncContent;
  selectedRowKeys?: string[]; // When scope is 'selected'
}

/**
 * Preview of what a sync operation will do
 */
export interface SyncPreview {
  inserts: number;
  updates: number;
  deletes: number;
  structureChanges: string[];
  sql: string[];
  warnings: string[];
  canExecute: boolean;
  blockedReason?: string; // e.g., "Cross-database type sync not supported"
}

/**
 * Result of executing a sync operation
 */
export interface SyncResult {
  success: boolean;
  insertedCount: number;
  updatedCount: number;
  deletedCount: number;
  structureChangesApplied: number;
  errors: string[];
  executionTime: number;
}

/**
 * Item in the sync queue (user-selected rows to sync)
 */
export interface SyncQueueItem {
  id: string;
  sourcePanelId: string;
  targetPanelId: string;
  tableName: string;
  primaryKey: Record<string, unknown>;
  primaryKeyString: string;
  operation: 'insert' | 'update' | 'delete';
  rowData: Record<string, unknown>;
}

/**
 * Saved sync template for reuse
 */
export interface SyncTemplate {
  id: string;
  name: string;
  description?: string;
  sourceConnectionId: string;
  targetConnectionId: string;
  tableName?: string; // null = prompt user to select
  scope: SyncScope;
  includeStructure: boolean;
  userId: string;
  teamId?: string; // null = personal template
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Form data for creating/editing a sync template
 */
export interface SyncTemplateFormData {
  name: string;
  description?: string;
  sourceConnectionId: string;
  targetConnectionId: string;
  tableName?: string;
  scope: SyncScope;
  includeStructure: boolean;
  teamId?: string;
}

/**
 * API request for comparing tables
 */
export interface CompareTablesRequest {
  sourceConnectionId: string;
  targetConnectionId: string;
  tableName: string;
  teamId?: string;
}

/**
 * API request for previewing sync
 */
export interface SyncPreviewRequest {
  sourceConnectionId: string;
  targetConnectionId: string;
  tableName: string;
  scope: SyncScope;
  content: SyncContent;
  selectedRowKeys?: string[];
  teamId?: string;
}

/**
 * API request for executing sync
 */
export interface SyncExecuteRequest extends SyncPreviewRequest {
  // Same as preview, execution uses the same params
}
