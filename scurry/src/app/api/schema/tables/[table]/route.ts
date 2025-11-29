import { NextRequest, NextResponse } from 'next/server';
import { getConnectionById } from '@/lib/db/app-db';
import { fetchColumns, fetchIndexes, fetchTables } from '@/lib/db/schema-fetcher';
import { getCurrentUser } from '@/lib/auth/session';
import { getEffectivePermissions } from '@/lib/db/permissions';
import { filterAllowedColumns, filterAllowedTables } from '@/lib/permissions/validator';
import { validateConnectionAccess } from '@/lib/db/teams';
import { validateTableExists } from '@/lib/db/sql-utils';

type RouteParams = { params: Promise<{ table: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { table } = await params;
    const connectionId = request.nextUrl.searchParams.get('connectionId');
    const teamId = request.nextUrl.searchParams.get('teamId');

    if (!connectionId) {
      return NextResponse.json(
        { error: 'connectionId is required' },
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

    // Get connection - for team connections, we need to fetch without user filter
    const connection = teamId 
      ? await getConnectionById(connectionId) 
      : await getConnectionById(connectionId, user.id);
      
    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Validate table exists in schema to prevent SQL injection
    const tables = await fetchTables(connection);
    const tableValidation = validateTableExists(table, tables);
    
    if (!tableValidation.valid || !tableValidation.actualName) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      );
    }
    
    // Use the actual table name from schema (preserves correct casing)
    const validatedTableName = tableValidation.actualName;

    // Check table access if this is a team connection
    if (teamId) {
      const permission = await getEffectivePermissions(user.id, teamId, connectionId);
      const allowedTables = filterAllowedTables([validatedTableName], permission);
      
      if (allowedTables.length === 0) {
        return NextResponse.json(
          { error: 'You do not have access to this table' },
          { status: 403 }
        );
      }
    }

    const [columns, indexes] = await Promise.all([
      fetchColumns(connection, validatedTableName),
      fetchIndexes(connection, validatedTableName),
    ]);

    // Filter columns based on permissions if this is a team connection
    let filteredColumns = columns;
    if (teamId) {
      const permission = await getEffectivePermissions(user.id, teamId, connectionId);
      const columnNames = columns.map(c => c.name);
      const allowedColumnNames = filterAllowedColumns(validatedTableName, columnNames, permission);
      filteredColumns = columns.filter(c => allowedColumnNames.includes(c.name));
    }

    return NextResponse.json({ columns: filteredColumns, indexes });
  } catch (error) {
    console.error('Failed to fetch table structure:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch table structure' },
      { status: 500 }
    );
  }
}
