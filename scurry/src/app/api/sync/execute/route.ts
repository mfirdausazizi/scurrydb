import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getConnectionById } from '@/lib/db/app-db';
import { fetchColumns, fetchIndexes, fetchTables } from '@/lib/db/schema-fetcher';
import { executeQuery } from '@/lib/db/query-executor';
import { validateConnectionAccess } from '@/lib/db/teams';
import { quoteIdentifier, type DatabaseType } from '@/lib/db/sql-utils';
import { logActivity } from '@/lib/db/activities';
import { calculateRowDiffs } from '@/lib/sync/diff-calculator';
import { executeSyncOperation } from '@/lib/sync/sync-executor';
import type { SyncExecuteRequest } from '@/types/sync';
import type { ColumnDefinition, IndexInfo } from '@/types';

const COMPARISON_LIMIT = 1000;

/**
 * Generate CREATE TABLE SQL from source table structure
 */
function generateCreateTableSQL(
  tableName: string,
  columns: ColumnDefinition[],
  indexes: IndexInfo[],
  dbType: DatabaseType
): string {
  const quote = dbType === 'mysql' || dbType === 'mariadb' ? '`' : '"';
  const quotedTable = `${quote}${tableName}${quote}`;
  
  const columnDefs = columns.map(col => {
    const quotedColumn = `${quote}${col.name}${quote}`;
    let def = `${quotedColumn} ${col.type}`;
    
    if (!col.nullable) {
      def += ' NOT NULL';
    }
    
    if (col.defaultValue !== null && col.defaultValue !== undefined) {
      // Handle special default values
      const defaultVal = col.defaultValue;
      if (defaultVal === 'CURRENT_TIMESTAMP' || defaultVal === 'current_timestamp()' || 
          defaultVal === 'NOW()' || defaultVal.includes('CURRENT_TIMESTAMP')) {
        def += ` DEFAULT ${defaultVal}`;
      } else if (typeof defaultVal === 'string' && !defaultVal.startsWith("'")) {
        def += ` DEFAULT '${defaultVal}'`;
      } else {
        def += ` DEFAULT ${defaultVal}`;
      }
    }
    
    return def;
  });
  
  // Add primary key constraint
  const pkColumns = columns.filter(c => c.isPrimaryKey).map(c => `${quote}${c.name}${quote}`);
  if (pkColumns.length > 0) {
    columnDefs.push(`PRIMARY KEY (${pkColumns.join(', ')})`);
  }
  
  // Add unique indexes as constraints (skip primary key index)
  const uniqueIndexes = indexes.filter(idx => idx.unique && !idx.primary);
  for (const idx of uniqueIndexes) {
    const idxColumns = idx.columns.map(c => `${quote}${c}${quote}`).join(', ');
    columnDefs.push(`UNIQUE KEY ${quote}${idx.name}${quote} (${idxColumns})`);
  }
  
  return `CREATE TABLE ${quotedTable} (\n  ${columnDefs.join(',\n  ')}\n)`;
}

/**
 * Check if a table exists in the target database
 */
async function tableExistsInTarget(
  connection: { type: string },
  tableName: string,
  tables: { name: string }[]
): Promise<boolean> {
  return tables.some(t => t.name.toLowerCase() === tableName.toLowerCase());
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: SyncExecuteRequest = await request.json();
    const {
      sourceConnectionId,
      targetConnectionId,
      tableName,
      scope,
      content,
      selectedRowKeys,
      teamId,
    } = body;

    if (!sourceConnectionId || !targetConnectionId || !tableName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate access to both connections
    const [sourceAccess, targetAccess] = await Promise.all([
      validateConnectionAccess(user.id, sourceConnectionId, teamId || null),
      validateConnectionAccess(user.id, targetConnectionId, teamId || null),
    ]);

    if (!sourceAccess.isValid) {
      return NextResponse.json({ error: 'Access denied to source connection' }, { status: 403 });
    }
    if (!targetAccess.isValid) {
      return NextResponse.json({ error: 'Access denied to target connection' }, { status: 403 });
    }

    // Get both connections
    const sourceConnection = teamId
      ? await getConnectionById(sourceConnectionId)
      : await getConnectionById(sourceConnectionId, user.id);
    const targetConnection = teamId
      ? await getConnectionById(targetConnectionId)
      : await getConnectionById(targetConnectionId, user.id);

    if (!sourceConnection) {
      return NextResponse.json({ error: 'Source connection not found' }, { status: 404 });
    }
    if (!targetConnection) {
      return NextResponse.json({ error: 'Target connection not found' }, { status: 404 });
    }

    // Check that both connections are the same database type
    if (sourceConnection.type !== targetConnection.type) {
      return NextResponse.json(
        { error: 'Cannot sync between different database types. Use comparison view only.' },
        { status: 400 }
      );
    }

    const dbType = sourceConnection.type as DatabaseType;

    // Get source table structure
    const [sourceColumns, sourceIndexes] = await Promise.all([
      fetchColumns(sourceConnection, tableName),
      fetchIndexes(sourceConnection, tableName),
    ]);
    
    const primaryKeyColumns = sourceColumns
      .filter((c) => c.isPrimaryKey)
      .map((c) => c.name);

    if (primaryKeyColumns.length === 0) {
      return NextResponse.json(
        { error: 'Table has no primary key. Cannot sync without primary key.' },
        { status: 400 }
      );
    }

    const columnNames = sourceColumns.map((c) => c.name);

    // Check if target table exists
    const targetTables = await fetchTables(targetConnection);
    const targetTableExists = await tableExistsInTarget(targetConnection, tableName, targetTables);
    
    let tableCreated = false;

    // If target table doesn't exist, create it (only if content includes structure)
    if (!targetTableExists) {
      if (content === 'data') {
        return NextResponse.json(
          { error: `Table "${tableName}" does not exist in target database. Enable "Table structure" sync to create it.` },
          { status: 400 }
        );
      }
      
      // Create the table in target
      const createTableSQL = generateCreateTableSQL(tableName, sourceColumns, sourceIndexes, dbType);
      console.log('Creating table in target:', createTableSQL);
      
      const createResult = await executeQuery(targetConnection, createTableSQL);
      if (createResult.error) {
        return NextResponse.json(
          { error: `Failed to create table in target: ${createResult.error}` },
          { status: 500 }
        );
      }
      
      tableCreated = true;
      
      // Log table creation activity (using data_inserted with tableCreated flag)
      await logActivity({
        userId: user.id,
        teamId: teamId || undefined,
        action: 'data_inserted',
        resourceType: 'connection',
        resourceId: targetConnectionId,
        metadata: {
          syncOperation: true,
          tableCreated: true,
          sourceConnectionId,
          tableName,
        },
      });
    }

    // Fetch current data from both tables
    const sourceQuotedTable = quoteIdentifier(tableName, dbType);
    const targetQuotedTable = quoteIdentifier(tableName, dbType);

    const sourceResult = await executeQuery(
      sourceConnection, 
      `SELECT * FROM ${sourceQuotedTable} LIMIT ${COMPARISON_LIMIT}`
    );

    if (sourceResult.error) {
      return NextResponse.json(
        { error: `Source query failed: ${sourceResult.error}` },
        { status: 500 }
      );
    }

    // For newly created tables, target rows will be empty
    let targetRows: Record<string, unknown>[] = [];
    if (!tableCreated) {
      const targetResult = await executeQuery(
        targetConnection, 
        `SELECT * FROM ${targetQuotedTable} LIMIT ${COMPARISON_LIMIT}`
      );
      
      if (targetResult.error) {
        return NextResponse.json(
          { error: `Target query failed: ${targetResult.error}` },
          { status: 500 }
        );
      }
      targetRows = targetResult.rows;
    }

    // Calculate diffs
    const diffs = calculateRowDiffs({
      primaryKeyColumns,
      sourceRows: sourceResult.rows,
      targetRows,
      columns: columnNames,
    });

    // Execute sync
    const result = await executeSyncOperation({
      sourceConnection,
      targetConnection,
      tableName,
      primaryKeyColumns,
      diffs,
      scope,
      content,
      selectedRowKeys,
      userId: user.id,
    });

    // Add tableCreated flag to result
    const finalResult = {
      ...result,
      tableCreated,
      rowsAffected: result.insertedCount + result.updatedCount,
    };

    // Log activity for sync operations
    if (result.insertedCount > 0) {
      await logActivity({
        userId: user.id,
        teamId: teamId || undefined,
        action: 'data_inserted',
        resourceType: 'connection',
        resourceId: targetConnectionId,
        metadata: {
          syncOperation: true,
          sourceConnectionId,
          tableName,
          rowCount: result.insertedCount,
        },
      });
    }
    if (result.updatedCount > 0) {
      await logActivity({
        userId: user.id,
        teamId: teamId || undefined,
        action: 'data_updated',
        resourceType: 'connection',
        resourceId: targetConnectionId,
        metadata: {
          syncOperation: true,
          sourceConnectionId,
          tableName,
          rowCount: result.updatedCount,
        },
      });
    }

    return NextResponse.json(finalResult);
  } catch (error) {
    console.error('Error executing sync:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute sync' },
      { status: 500 }
    );
  }
}
