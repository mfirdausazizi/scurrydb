export type ChangeOperation = 'INSERT' | 'UPDATE' | 'DELETE';

export type FilterOperator =
  | 'exact_match'
  | 'contains'
  | 'not_contains'
  | 'equals'
  | 'not_equals'
  | 'exists'
  | 'not_exists'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal';

export interface ColumnFilter {
  column: string;
  operator: FilterOperator;
  value: string;
}

export interface PendingCellChange {
  rowIndex: number;
  column: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface PendingRowInsert {
  tempId: string;
  values: Record<string, unknown>;
}

export interface PendingRowDelete {
  rowIndex: number;
  rowData: Record<string, unknown>;
}

export interface PendingChanges {
  updates: PendingCellChange[];
  inserts: PendingRowInsert[];
  deletes: PendingRowDelete[];
}

export interface DataChangeLog {
  id: string;
  connectionId: string;
  tableName: string;
  operation: ChangeOperation;
  rowIdentifier: Record<string, unknown> | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  userId: string;
  appliedAt: Date;
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
}

export interface ApplyChangesRequest {
  connectionId: string;
  tableName: string;
  primaryKeyColumns: string[];
  changes: PendingChanges;
}

export interface ApplyChangesResult {
  success: boolean;
  insertedCount: number;
  updatedCount: number;
  deletedCount: number;
  errors: string[];
}

export const FILTER_OPERATOR_LABELS: Record<FilterOperator, string> = {
  exact_match: 'Exact match',
  contains: 'Contains',
  not_contains: 'Does not contain',
  equals: 'Equals',
  not_equals: 'Not equals',
  exists: 'Exists (not null)',
  not_exists: 'Does not exist (null)',
  starts_with: 'Starts with',
  ends_with: 'Ends with',
  greater_than: 'Greater than',
  less_than: 'Less than',
  greater_than_or_equal: 'Greater than or equal',
  less_than_or_equal: 'Less than or equal',
};
