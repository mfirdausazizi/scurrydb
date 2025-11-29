import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { getConnectionById } from '@/lib/db/app-db';
import { validateConnectionAccess } from '@/lib/db/teams';
import { getPoolManager } from '@/lib/db/connection-pool';
import type { DatabaseType } from '@/types';

const importSchema = z.object({
  connectionId: z.string().uuid(),
  tableName: z.string().min(1).max(128).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
  createTable: z.boolean().default(false),
  createTableSQL: z.string().optional(),
  columns: z.array(z.object({
    csvColumnIndex: z.number().int().min(0),
    dbColumn: z.string().min(1).max(128),
    dbType: z.string().min(1),
    skip: z.boolean().optional(),
  })),
  rows: z.array(z.array(z.string().nullable())),
  teamId: z.string().uuid().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = importSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { connectionId, tableName, createTable, createTableSQL, columns, rows, teamId } = validation.data;

    // Validate connection access
    const accessValidation = await validateConnectionAccess(user.id, connectionId, teamId || null);
    if (!accessValidation.isValid) {
      return NextResponse.json({ error: accessValidation.error || 'Access denied' }, { status: 403 });
    }

    // Get connection
    const connection = teamId 
      ? await getConnectionById(connectionId) 
      : await getConnectionById(connectionId, user.id);
    
    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Get pool manager
    const poolManager = getPoolManager();
    
    // Filter active columns
    const activeColumns = columns.filter(c => !c.skip);
    
    if (activeColumns.length === 0) {
      return NextResponse.json({ error: 'At least one column must be imported' }, { status: 400 });
    }

    let insertedRows = 0;
    const errors: Array<{ row: number; error: string }> = [];

    try {
      // Create table if requested
      if (createTable && createTableSQL) {
        await poolManager.executeQuery(connection, createTableSQL);
      }

      // Generate and execute INSERT statements in batches
      const batchSize = 100;
      const dbType = connection.type as DatabaseType;
      
      for (let i = 0; i < rows.length; i += batchSize) {
        const batchRows = rows.slice(i, Math.min(i + batchSize, rows.length));
        
        try {
          // Build parameterized INSERT
          const quotedTable = quoteIdentifier(tableName, dbType);
          const quotedColumns = activeColumns.map(c => quoteIdentifier(c.dbColumn, dbType)).join(', ');
          
          const valuePlaceholders: string[] = [];
          const params: unknown[] = [];
          
          batchRows.forEach((row, rowIndex) => {
            const rowPlaceholders: string[] = [];
            activeColumns.forEach((col, colIndex) => {
              const value = row[col.csvColumnIndex];
              params.push(transformValue(value, col.dbType));
              
              if (dbType === 'postgresql') {
                rowPlaceholders.push(`$${rowIndex * activeColumns.length + colIndex + 1}`);
              } else {
                rowPlaceholders.push('?');
              }
            });
            valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
          });
          
          const sql = `INSERT INTO ${quotedTable} (${quotedColumns}) VALUES ${valuePlaceholders.join(', ')}`;
          
          await poolManager.executeQuery(connection, sql, params);
          insertedRows += batchRows.length;
        } catch (batchError) {
          // Try inserting rows individually to identify problematic rows
          for (let j = 0; j < batchRows.length; j++) {
            const row = batchRows[j];
            const rowNumber = i + j + 1;
            
            try {
              const quotedTable = quoteIdentifier(tableName, dbType);
              const quotedColumns = activeColumns.map(c => quoteIdentifier(c.dbColumn, dbType)).join(', ');
              const placeholders = activeColumns.map((_, idx) => 
                dbType === 'postgresql' ? `$${idx + 1}` : '?'
              ).join(', ');
              const params = activeColumns.map(col => transformValue(row[col.csvColumnIndex], col.dbType));
              
              const sql = `INSERT INTO ${quotedTable} (${quotedColumns}) VALUES (${placeholders})`;
              await poolManager.executeQuery(connection, sql, params);
              insertedRows++;
            } catch (rowError) {
              errors.push({
                row: rowNumber,
                error: rowError instanceof Error ? rowError.message : 'Unknown error',
              });
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        insertedRows,
        totalRows: rows.length,
        errors,
      });
    } catch (error) {
      return NextResponse.json({
        success: false,
        insertedRows,
        totalRows: rows.length,
        errors: [
          ...errors,
          { row: 0, error: error instanceof Error ? error.message : 'Import failed' },
        ],
      }, { status: 500 });
    }
  } catch (error) {
    console.error('CSV import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    );
  }
}

function quoteIdentifier(name: string, dbType: DatabaseType): string {
  switch (dbType) {
    case 'mysql':
    case 'mariadb':
      return `\`${name}\``;
    case 'postgresql':
    case 'sqlite':
      return `"${name}"`;
    default:
      return `"${name}"`;
  }
}

function transformValue(value: string | null | undefined, dbType: string): unknown {
  if (value === undefined || value === '' || value === null) {
    return null;
  }
  
  const upperType = dbType.toUpperCase();
  
  if (upperType.includes('INT') || upperType === 'BIGINT') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
  }
  
  if (upperType.includes('DECIMAL') || upperType.includes('NUMERIC') || upperType === 'REAL') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }
  
  if (upperType === 'BOOLEAN' || upperType === 'TINYINT(1)') {
    const lower = value.toLowerCase();
    return ['true', '1', 'yes', 't'].includes(lower);
  }
  
  return value;
}
