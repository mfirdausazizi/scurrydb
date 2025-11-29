import { NextRequest, NextResponse } from 'next/server';
import { getConnectionById } from '@/lib/db/app-db';
import { executeQueryWithParams } from '@/lib/db/query-executor';
import { getCurrentUser } from '@/lib/auth/session';
import { validateConnectionAccess } from '@/lib/db/teams';
import { getEffectivePermissions } from '@/lib/db/permissions';
import { filterAllowedTables, filterAllowedColumns } from '@/lib/permissions/validator';

type RouteParams = { params: Promise<{ table: string }> };

// Maximum rows to return in a search
const MAX_SEARCH_RESULTS = 500;

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { table } = await params;
    const searchParams = request.nextUrl.searchParams;
    
    const connectionId = searchParams.get('connectionId');
    const teamId = searchParams.get('teamId');
    const search = searchParams.get('search');
    const searchColumns = searchParams.getAll('columns');
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '100', 10),
      MAX_SEARCH_RESULTS
    );
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Validate required parameters
    if (!connectionId) {
      return NextResponse.json(
        { error: 'connectionId is required' },
        { status: 400 }
      );
    }

    if (!search || search.trim().length < 3) {
      return NextResponse.json(
        { error: 'Search term must be at least 3 characters' },
        { status: 400 }
      );
    }

    if (!searchColumns || searchColumns.length === 0) {
      return NextResponse.json(
        { error: 'At least one column must be specified for search' },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate connection access based on workspace context
    const accessValidation = await validateConnectionAccess(user.id, connectionId, teamId || null);
    if (!accessValidation.isValid) {
      return NextResponse.json(
        { error: accessValidation.error || 'Access denied' },
        { status: 403 }
      );
    }

    // Get connection
    const connection = teamId 
      ? await getConnectionById(connectionId) 
      : await getConnectionById(connectionId, user.id);
      
    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Check table and column access for team connections
    let allowedSearchColumns = searchColumns;
    if (teamId) {
      const permission = await getEffectivePermissions(user.id, teamId, connectionId);
      const allowedTables = filterAllowedTables([table], permission);
      
      if (allowedTables.length === 0) {
        return NextResponse.json(
          { error: 'You do not have access to this table' },
          { status: 403 }
        );
      }

      // Filter search columns to only allowed ones
      allowedSearchColumns = filterAllowedColumns(table, searchColumns, permission);
      
      if (allowedSearchColumns.length === 0) {
        return NextResponse.json(
          { error: 'You do not have access to any of the specified columns' },
          { status: 403 }
        );
      }
    }

    // Sanitize table and column names (only allow alphanumeric and underscore)
    const safeTable = table.replace(/[^a-zA-Z0-9_]/g, '');
    const safeColumns = allowedSearchColumns.map(col => col.replace(/[^a-zA-Z0-9_]/g, ''));
    
    // Validate columns aren't empty after sanitization
    const validColumns = safeColumns.filter(col => col.length > 0);
    if (validColumns.length === 0) {
      return NextResponse.json(
        { error: 'Invalid column names' },
        { status: 400 }
      );
    }

    // Build the search query based on database type
    const searchTerm = `%${search.trim()}%`;
    const { sql, params: queryParams } = buildSearchQuery(
      connection.type,
      safeTable,
      validColumns,
      searchTerm,
      limit,
      offset
    );

    const result = await executeQueryWithParams(connection, sql, queryParams, limit);
    
    // Filter columns in response if there are restrictions
    if (teamId && result.columns && result.columns.length > 0) {
      const permission = await getEffectivePermissions(user.id, teamId, connectionId);
      const columnNames = result.columns.map(c => c.name);
      const filteredColumnNames = filterAllowedColumns(table, columnNames, permission);
      
      result.columns = result.columns.filter(c => filteredColumnNames.includes(c.name));
      result.rows = result.rows.map(row => {
        const filteredRow: Record<string, unknown> = {};
        for (const colName of filteredColumnNames) {
          filteredRow[colName] = row[colName];
        }
        return filteredRow;
      });
    }

    // Add search metadata to response
    return NextResponse.json({
      ...result,
      searchMeta: {
        searchTerm: search,
        searchColumns: validColumns,
        offset,
        limit,
        hasMore: result.rows.length === limit,
      },
    });
  } catch (error) {
    console.error('Failed to search table:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search table' },
      { status: 500 }
    );
  }
}

interface SearchQueryResult {
  sql: string;
  params: unknown[];
}

function buildSearchQuery(
  dbType: string,
  table: string,
  columns: string[],
  searchTerm: string,
  limit: number,
  offset: number
): SearchQueryResult {
  switch (dbType) {
    case 'postgresql': {
      // PostgreSQL uses $1, $2, etc. for parameters and ILIKE for case-insensitive
      const conditions = columns.map((col, i) => 
        `CAST("${col}" AS TEXT) ILIKE $${i + 1}`
      ).join(' OR ');
      
      const paramIndex = columns.length;
      const sql = `SELECT * FROM "${table}" WHERE ${conditions} LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}`;
      const params = [...columns.map(() => searchTerm), limit, offset];
      
      return { sql, params };
    }
    
    case 'mysql':
    case 'mariadb': {
      // MySQL uses ? for parameters and LIKE (case-insensitive by default with utf8)
      const conditions = columns.map(col => 
        `CAST(\`${col}\` AS CHAR) LIKE ?`
      ).join(' OR ');
      
      const sql = `SELECT * FROM \`${table}\` WHERE ${conditions} LIMIT ? OFFSET ?`;
      const params = [...columns.map(() => searchTerm), limit, offset];
      
      return { sql, params };
    }
    
    case 'sqlite': {
      // SQLite uses ? for parameters and LIKE (case-insensitive for ASCII)
      const conditions = columns.map(col => 
        `CAST("${col}" AS TEXT) LIKE ?`
      ).join(' OR ');
      
      const sql = `SELECT * FROM "${table}" WHERE ${conditions} LIMIT ? OFFSET ?`;
      const params = [...columns.map(() => searchTerm), limit, offset];
      
      return { sql, params };
    }
    
    default:
      throw new Error(`Unsupported database type: ${dbType}`);
  }
}
