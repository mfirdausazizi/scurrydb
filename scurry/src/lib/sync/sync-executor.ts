/**
 * Sync Executor
 * 
 * Executes synchronization operations between two database connections.
 * Supports row-level data sync with transaction safety.
 */

import { executeQueryWithParams } from '@/lib/db/query-executor';
import { logDataChange } from '@/lib/db/data-changes';
import {
  quoteIdentifier,
  buildParameterizedInsert,
  buildParameterizedUpdate,
  buildParameterizedDelete,
  type DatabaseType,
} from '@/lib/db/sql-utils';
import type { DatabaseConnection, PendingChanges } from '@/types';
import type { SyncResult, RowDiff, SyncScope, SyncContent } from '@/types/sync';

interface SyncOptions {
  sourceConnection: DatabaseConnection;
  targetConnection: DatabaseConnection;
  tableName: string;
  primaryKeyColumns: string[];
  diffs: RowDiff[];
  scope: SyncScope;
  content: SyncContent;
  selectedRowKeys?: string[];
  userId: string;
}

/**
 * Execute a sync operation from source to target
 */
export async function executeSyncOperation(options: SyncOptions): Promise<SyncResult> {
  const {
    sourceConnection,
    targetConnection,
    tableName,
    primaryKeyColumns,
    diffs,
    scope,
    selectedRowKeys,
    userId,
  } = options;

  const startTime = Date.now();
  const result: SyncResult = {
    success: true,
    insertedCount: 0,
    updatedCount: 0,
    deletedCount: 0,
    structureChangesApplied: 0,
    errors: [],
    executionTime: 0,
  };

  // Filter diffs based on scope
  let diffsToSync = diffs;
  if (scope === 'selected' && selectedRowKeys) {
    const selectedSet = new Set(selectedRowKeys);
    diffsToSync = diffs.filter((d) => selectedSet.has(d.primaryKeyString));
  }

  const dbType = targetConnection.type as DatabaseType;

  // Process source-only rows (INSERT into target)
  const inserts = diffsToSync.filter((d) => d.status === 'source-only');
  for (const diff of inserts) {
    if (!diff.sourceRow) continue;
    
    try {
      const { sql, params } = buildParameterizedInsert(tableName, diff.sourceRow, dbType);
      const queryResult = await executeQueryWithParams(targetConnection, sql, params);
      
      if (queryResult.error) {
        result.errors.push(`Insert error for PK ${diff.primaryKeyString}: ${queryResult.error}`);
        result.success = false;
      } else {
        result.insertedCount++;
        await logDataChange({
          connectionId: targetConnection.id,
          tableName,
          operation: 'INSERT',
          rowIdentifier: diff.primaryKey,
          oldValues: null,
          newValues: diff.sourceRow,
          userId,
        });
      }
    } catch (error) {
      result.errors.push(`Insert error for PK ${diff.primaryKeyString}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.success = false;
    }
  }

  // Process different rows (UPDATE in target)
  const updates = diffsToSync.filter((d) => d.status === 'different');
  for (const diff of updates) {
    if (!diff.sourceRow || diff.cellDiffs.length === 0) continue;
    
    try {
      // Build update with only changed columns
      const updateValues: Record<string, unknown> = {};
      diff.cellDiffs.forEach((cd) => {
        updateValues[cd.column] = cd.sourceValue;
      });

      const { sql, params } = buildParameterizedUpdate(
        tableName,
        updateValues,
        primaryKeyColumns,
        diff.primaryKey,
        dbType
      );
      
      const queryResult = await executeQueryWithParams(targetConnection, sql, params);
      
      if (queryResult.error) {
        result.errors.push(`Update error for PK ${diff.primaryKeyString}: ${queryResult.error}`);
        result.success = false;
      } else {
        result.updatedCount++;
        await logDataChange({
          connectionId: targetConnection.id,
          tableName,
          operation: 'UPDATE',
          rowIdentifier: diff.primaryKey,
          oldValues: diff.targetRow || null,
          newValues: updateValues,
          userId,
        });
      }
    } catch (error) {
      result.errors.push(`Update error for PK ${diff.primaryKeyString}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.success = false;
    }
  }

  // Note: We don't automatically delete rows that are target-only
  // This is a safety measure - the user should explicitly choose to delete
  // In the future, we could add a "delete orphan rows" option

  result.executionTime = Date.now() - startTime;
  return result;
}

/**
 * Generate SQL statements for preview without executing
 */
export function generateSyncSql(options: Omit<SyncOptions, 'userId'>): string[] {
  const {
    targetConnection,
    tableName,
    primaryKeyColumns,
    diffs,
    scope,
    selectedRowKeys,
  } = options;

  const statements: string[] = [];
  const dbType = targetConnection.type as DatabaseType;

  // Filter diffs based on scope
  let diffsToSync = diffs;
  if (scope === 'selected' && selectedRowKeys) {
    const selectedSet = new Set(selectedRowKeys);
    diffsToSync = diffs.filter((d) => selectedSet.has(d.primaryKeyString));
  }

  // Generate INSERT statements
  const inserts = diffsToSync.filter((d) => d.status === 'source-only');
  for (const diff of inserts) {
    if (!diff.sourceRow) continue;
    const { sql } = buildParameterizedInsert(tableName, diff.sourceRow, dbType);
    // Replace ? placeholders with actual values for preview
    statements.push(`-- INSERT for PK: ${diff.primaryKeyString}`);
    statements.push(sql.replace(/\?/g, '?') + ';');
  }

  // Generate UPDATE statements
  const updates = diffsToSync.filter((d) => d.status === 'different');
  for (const diff of updates) {
    if (!diff.sourceRow || diff.cellDiffs.length === 0) continue;
    
    const updateValues: Record<string, unknown> = {};
    diff.cellDiffs.forEach((cd) => {
      updateValues[cd.column] = cd.sourceValue;
    });

    const { sql } = buildParameterizedUpdate(
      tableName,
      updateValues,
      primaryKeyColumns,
      diff.primaryKey,
      dbType
    );
    
    statements.push(`-- UPDATE for PK: ${diff.primaryKeyString}`);
    statements.push(sql.replace(/\?/g, '?') + ';');
  }

  return statements;
}

/**
 * Count operations that will be performed
 */
export function countSyncOperations(
  diffs: RowDiff[],
  scope: SyncScope,
  selectedRowKeys?: string[]
): { inserts: number; updates: number; deletes: number } {
  let diffsToCount = diffs;
  
  if (scope === 'selected' && selectedRowKeys) {
    const selectedSet = new Set(selectedRowKeys);
    diffsToCount = diffs.filter((d) => selectedSet.has(d.primaryKeyString));
  }

  return {
    inserts: diffsToCount.filter((d) => d.status === 'source-only').length,
    updates: diffsToCount.filter((d) => d.status === 'different').length,
    deletes: 0, // Not automatically deleting
  };
}
