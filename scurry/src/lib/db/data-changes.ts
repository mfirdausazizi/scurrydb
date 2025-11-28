import { v4 as uuidv4 } from 'uuid';
import type {
  DataChangeLog,
  ChangeOperation,
  PendingChanges,
  ApplyChangesResult,
} from '@/types';
import { executeQuery } from './query-executor';
import type { DatabaseConnection } from '@/types';
import { getDbClient, getDbType, type DbRow } from './db-client';

function rowToDataChangeLog(row: DbRow): DataChangeLog {
  const dbType = getDbType();
  const log: DataChangeLog = {
    id: row.id as string,
    connectionId: row.connection_id as string,
    tableName: row.table_name as string,
    operation: row.operation as ChangeOperation,
    rowIdentifier: row.row_identifier 
      ? (dbType === 'postgres' 
          ? (row.row_identifier as Record<string, unknown>) 
          : JSON.parse(row.row_identifier as string)) 
      : null,
    oldValues: row.old_values 
      ? (dbType === 'postgres' 
          ? (row.old_values as Record<string, unknown>) 
          : JSON.parse(row.old_values as string)) 
      : null,
    newValues: row.new_values 
      ? (dbType === 'postgres' 
          ? (row.new_values as Record<string, unknown>) 
          : JSON.parse(row.new_values as string)) 
      : null,
    userId: row.user_id as string,
    appliedAt: new Date(row.applied_at as string),
  };

  if (row.user_email) {
    log.user = {
      id: row.user_id as string,
      email: row.user_email as string,
      name: row.user_name as string | null,
    };
  }

  return log;
}

export async function logDataChange(data: {
  connectionId: string;
  tableName: string;
  operation: ChangeOperation;
  rowIdentifier?: Record<string, unknown> | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  userId: string;
}): Promise<DataChangeLog> {
  const client = getDbClient();
  const now = new Date().toISOString();
  const id = uuidv4();

  await client.execute(
    `INSERT INTO data_change_logs (id, connection_id, table_name, operation, row_identifier, old_values, new_values, user_id, applied_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.connectionId,
      data.tableName,
      data.operation,
      data.rowIdentifier ? JSON.stringify(data.rowIdentifier) : null,
      data.oldValues ? JSON.stringify(data.oldValues) : null,
      data.newValues ? JSON.stringify(data.newValues) : null,
      data.userId,
      now
    ]
  );

  const log = await getDataChangeLogById(id);
  if (!log) throw new Error('Failed to log data change');
  return log;
}

export async function getDataChangeLogById(id: string): Promise<DataChangeLog | null> {
  const client = getDbClient();
  const row = await client.queryOne<DbRow>(`
    SELECT 
      dcl.*,
      u.email as user_email,
      u.name as user_name
    FROM data_change_logs dcl
    LEFT JOIN users u ON dcl.user_id = u.id
    WHERE dcl.id = ?
  `, [id]);

  return row ? rowToDataChangeLog(row) : null;
}

export async function getDataChangeLogs(options: {
  connectionId?: string;
  tableName?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}): Promise<DataChangeLog[]> {
  const client = getDbClient();
  const dbType = getDbType();
  const limit = options.limit || 50;
  const offset = options.offset || 0;
  
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (options.connectionId) {
    conditions.push(dbType === 'postgres' ? `dcl.connection_id = $${paramIndex++}` : 'dcl.connection_id = ?');
    params.push(options.connectionId);
  }

  if (options.tableName) {
    conditions.push(dbType === 'postgres' ? `dcl.table_name = $${paramIndex++}` : 'dcl.table_name = ?');
    params.push(options.tableName);
  }

  if (options.userId) {
    conditions.push(dbType === 'postgres' ? `dcl.user_id = $${paramIndex++}` : 'dcl.user_id = ?');
    params.push(options.userId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = dbType === 'postgres'
    ? `SELECT 
        dcl.*,
        u.email as user_email,
        u.name as user_name
      FROM data_change_logs dcl
      LEFT JOIN users u ON dcl.user_id = u.id
      ${whereClause}
      ORDER BY dcl.applied_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    : `SELECT 
        dcl.*,
        u.email as user_email,
        u.name as user_name
      FROM data_change_logs dcl
      LEFT JOIN users u ON dcl.user_id = u.id
      ${whereClause}
      ORDER BY dcl.applied_at DESC
      LIMIT ? OFFSET ?`;

  params.push(limit, offset);
  
  const rows = await client.query<DbRow>(sql, params);
  return rows.map(rowToDataChangeLog);
}

function escapeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }
  if (typeof value === 'string') {
    return `'${value.replace(/'/g, "''")}'`;
  }
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildWhereClause(
  primaryKeyColumns: string[],
  rowData: Record<string, unknown>
): string {
  const conditions = primaryKeyColumns.map((col) => {
    const value = rowData[col];
    if (value === null || value === undefined) {
      return `${col} IS NULL`;
    }
    return `${col} = ${escapeValue(value)}`;
  });
  return conditions.join(' AND ');
}

export async function applyDataChanges(
  connection: DatabaseConnection,
  tableName: string,
  primaryKeyColumns: string[],
  changes: PendingChanges,
  userId: string
): Promise<ApplyChangesResult> {
  const result: ApplyChangesResult = {
    success: true,
    insertedCount: 0,
    updatedCount: 0,
    deletedCount: 0,
    errors: [],
  };

  // Process deletes first
  for (const del of changes.deletes) {
    try {
      const whereClause = buildWhereClause(primaryKeyColumns, del.rowData);
      const sql = `DELETE FROM ${tableName} WHERE ${whereClause}`;
      
      const queryResult = await executeQuery(connection, sql);
      
      if (queryResult.error) {
        result.errors.push(`Delete error: ${queryResult.error}`);
        result.success = false;
      } else {
        result.deletedCount++;
        await logDataChange({
          connectionId: connection.id,
          tableName,
          operation: 'DELETE',
          rowIdentifier: Object.fromEntries(
            primaryKeyColumns.map((col) => [col, del.rowData[col]])
          ),
          oldValues: del.rowData,
          newValues: null,
          userId,
        });
      }
    } catch (error) {
      result.errors.push(`Delete error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.success = false;
    }
  }

  // Process updates
  const updatesByRow = new Map<number, Record<string, { oldValue: unknown; newValue: unknown }>>();
  for (const update of changes.updates) {
    if (!updatesByRow.has(update.rowIndex)) {
      updatesByRow.set(update.rowIndex, {});
    }
    updatesByRow.get(update.rowIndex)![update.column] = {
      oldValue: update.oldValue,
      newValue: update.newValue,
    };
  }

  for (const [, columnUpdates] of updatesByRow) {
    try {
      const setClause = Object.entries(columnUpdates)
        .map(([col, { newValue }]) => `${col} = ${escapeValue(newValue)}`)
        .join(', ');
      
      const oldValues: Record<string, unknown> = {};
      const newValues: Record<string, unknown> = {};
      for (const [col, { oldValue, newValue }] of Object.entries(columnUpdates)) {
        oldValues[col] = oldValue;
        newValues[col] = newValue;
      }

      // Build WHERE clause using old values of primary key columns
      const whereConditions = primaryKeyColumns.map((col) => {
        const value = columnUpdates[col]?.oldValue ?? oldValues[col];
        if (value === null || value === undefined) {
          return `${col} IS NULL`;
        }
        return `${col} = ${escapeValue(value)}`;
      });

      const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${whereConditions.join(' AND ')}`;
      
      const queryResult = await executeQuery(connection, sql);
      
      if (queryResult.error) {
        result.errors.push(`Update error: ${queryResult.error}`);
        result.success = false;
      } else {
        result.updatedCount++;
        await logDataChange({
          connectionId: connection.id,
          tableName,
          operation: 'UPDATE',
          rowIdentifier: Object.fromEntries(
            primaryKeyColumns.map((col) => [col, oldValues[col]])
          ),
          oldValues,
          newValues,
          userId,
        });
      }
    } catch (error) {
      result.errors.push(`Update error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.success = false;
    }
  }

  // Process inserts
  for (const insert of changes.inserts) {
    try {
      const columns = Object.keys(insert.values);
      const values = Object.values(insert.values);
      
      const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.map(escapeValue).join(', ')})`;
      
      const queryResult = await executeQuery(connection, sql);
      
      if (queryResult.error) {
        result.errors.push(`Insert error: ${queryResult.error}`);
        result.success = false;
      } else {
        result.insertedCount++;
        await logDataChange({
          connectionId: connection.id,
          tableName,
          operation: 'INSERT',
          rowIdentifier: null,
          oldValues: null,
          newValues: insert.values,
          userId,
        });
      }
    } catch (error) {
      result.errors.push(`Insert error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.success = false;
    }
  }

  return result;
}

export async function deleteOldDataChangeLogs(daysToKeep: number = 90): Promise<number> {
  const client = getDbClient();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const result = await client.execute('DELETE FROM data_change_logs WHERE applied_at < ?', [cutoffDate.toISOString()]);
  return result.changes;
}
