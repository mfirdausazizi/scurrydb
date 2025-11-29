/**
 * Diff Calculator
 * 
 * Calculates differences between two tables for comparison view.
 * Matches rows by primary key and compares cell values.
 */

import type { RowDiff, CellDiff, RowDiffStatus, TableComparisonResult } from '@/types/sync';
import { serializePrimaryKey } from '@/lib/store/sync-store';

interface CompareOptions {
  primaryKeyColumns: string[];
  sourceRows: Record<string, unknown>[];
  targetRows: Record<string, unknown>[];
  columns: string[];
}

/**
 * Compare two sets of rows and calculate differences
 */
export function calculateRowDiffs(options: CompareOptions): RowDiff[] {
  const { primaryKeyColumns, sourceRows, targetRows, columns } = options;
  
  if (primaryKeyColumns.length === 0) {
    // Without primary keys, we can't match rows
    return [];
  }

  const diffs: RowDiff[] = [];
  
  // Create lookup maps by primary key
  const sourceMap = new Map<string, Record<string, unknown>>();
  const targetMap = new Map<string, Record<string, unknown>>();

  sourceRows.forEach((row) => {
    const pk = extractPrimaryKey(row, primaryKeyColumns);
    const pkString = serializePrimaryKey(pk);
    sourceMap.set(pkString, row);
  });

  targetRows.forEach((row) => {
    const pk = extractPrimaryKey(row, primaryKeyColumns);
    const pkString = serializePrimaryKey(pk);
    targetMap.set(pkString, row);
  });

  // Find all unique primary keys
  const allKeys = new Set([...sourceMap.keys(), ...targetMap.keys()]);

  allKeys.forEach((pkString) => {
    const sourceRow = sourceMap.get(pkString);
    const targetRow = targetMap.get(pkString);
    const pk = sourceRow 
      ? extractPrimaryKey(sourceRow, primaryKeyColumns)
      : extractPrimaryKey(targetRow!, primaryKeyColumns);

    let status: RowDiffStatus;
    let cellDiffs: CellDiff[] = [];

    if (sourceRow && targetRow) {
      // Row exists in both - check for differences
      cellDiffs = compareCells(sourceRow, targetRow, columns);
      status = cellDiffs.length > 0 ? 'different' : 'match';
    } else if (sourceRow) {
      // Row only in source
      status = 'source-only';
    } else {
      // Row only in target
      status = 'target-only';
    }

    diffs.push({
      primaryKey: pk,
      primaryKeyString: pkString,
      status,
      cellDiffs,
      sourceRow,
      targetRow,
    });
  });

  // Sort by primary key for consistent ordering
  diffs.sort((a, b) => a.primaryKeyString.localeCompare(b.primaryKeyString));

  return diffs;
}

/**
 * Extract primary key values from a row
 */
function extractPrimaryKey(
  row: Record<string, unknown>,
  primaryKeyColumns: string[]
): Record<string, unknown> {
  const pk: Record<string, unknown> = {};
  primaryKeyColumns.forEach((col) => {
    pk[col] = row[col];
  });
  return pk;
}

/**
 * Compare cell values between two rows
 */
function compareCells(
  sourceRow: Record<string, unknown>,
  targetRow: Record<string, unknown>,
  columns: string[]
): CellDiff[] {
  const diffs: CellDiff[] = [];

  columns.forEach((column) => {
    const sourceValue = sourceRow[column];
    const targetValue = targetRow[column];

    if (!valuesEqual(sourceValue, targetValue)) {
      diffs.push({
        column,
        sourceValue,
        targetValue,
      });
    }
  });

  return diffs;
}

/**
 * Deep equality check for cell values
 */
function valuesEqual(a: unknown, b: unknown): boolean {
  // Handle null/undefined
  if (a === null && b === null) return true;
  if (a === undefined && b === undefined) return true;
  if (a === null || a === undefined || b === null || b === undefined) return false;

  // Handle different types
  if (typeof a !== typeof b) return false;

  // Handle objects (including arrays)
  if (typeof a === 'object' && typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  // Handle Date objects stored as strings
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // Handle primitives
  return a === b;
}

/**
 * Create comparison summary statistics
 */
export function calculateComparisonSummary(diffs: RowDiff[]): {
  totalRows: number;
  matchingRows: number;
  differentRows: number;
  sourceOnlyRows: number;
  targetOnlyRows: number;
} {
  let matchingRows = 0;
  let differentRows = 0;
  let sourceOnlyRows = 0;
  let targetOnlyRows = 0;

  diffs.forEach((diff) => {
    switch (diff.status) {
      case 'match':
        matchingRows++;
        break;
      case 'different':
        differentRows++;
        break;
      case 'source-only':
        sourceOnlyRows++;
        break;
      case 'target-only':
        targetOnlyRows++;
        break;
    }
  });

  return {
    totalRows: diffs.length,
    matchingRows,
    differentRows,
    sourceOnlyRows,
    targetOnlyRows,
  };
}

/**
 * Create a full table comparison result
 */
export function createTableComparisonResult(
  sourcePanelId: string,
  targetPanelId: string,
  tableName: string,
  primaryKeyColumns: string[],
  sourceRows: Record<string, unknown>[],
  targetRows: Record<string, unknown>[],
  columns: string[]
): TableComparisonResult {
  const diffs = calculateRowDiffs({
    primaryKeyColumns,
    sourceRows,
    targetRows,
    columns,
  });

  const summary = calculateComparisonSummary(diffs);

  return {
    sourcePanelId,
    targetPanelId,
    tableName,
    primaryKeyColumns,
    totalSourceRows: sourceRows.length,
    totalTargetRows: targetRows.length,
    ...summary,
    diffs,
  };
}

/**
 * Convert diffs to a Map for quick lookup by row key
 */
export function diffsToStatusMap(diffs: RowDiff[]): Map<string, RowDiffStatus> {
  const map = new Map<string, RowDiffStatus>();
  diffs.forEach((diff) => {
    map.set(diff.primaryKeyString, diff.status);
  });
  return map;
}

/**
 * Convert diffs to a Map of cell diffs for quick lookup
 */
export function diffsToCellDiffMap(diffs: RowDiff[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  diffs.forEach((diff) => {
    if (diff.cellDiffs.length > 0) {
      const columnSet = new Set(diff.cellDiffs.map((cd) => cd.column));
      map.set(diff.primaryKeyString, columnSet);
    }
  });
  return map;
}
