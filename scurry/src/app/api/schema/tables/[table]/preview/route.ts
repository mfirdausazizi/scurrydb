import { NextRequest, NextResponse } from 'next/server';
import { getConnectionById } from '@/lib/db/app-db';
import { executeQuery } from '@/lib/db/query-executor';
import { getCurrentUser } from '@/lib/auth/session';
import { validateConnectionAccess } from '@/lib/db/teams';
import { getEffectivePermissions } from '@/lib/db/permissions';
import { filterAllowedTables, filterAllowedColumns } from '@/lib/permissions/validator';

type RouteParams = { params: Promise<{ table: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { table } = await params;
    const connectionId = request.nextUrl.searchParams.get('connectionId');
    const teamId = request.nextUrl.searchParams.get('teamId');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '100', 10);

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

    // Check table access and get allowed columns if this is a team connection
    let allowedColumns: string[] | null = null;
    if (teamId) {
      const permission = await getEffectivePermissions(user.id, teamId, connectionId);
      const allowedTables = filterAllowedTables([table], permission);
      
      if (allowedTables.length === 0) {
        return NextResponse.json(
          { error: 'You do not have access to this table' },
          { status: 403 }
        );
      }

      // Get allowed columns for this table
      // We'll fetch all columns first then filter the result
      const hiddenColumns = permission?.hiddenColumns.get(table.toLowerCase());
      if (hiddenColumns && hiddenColumns.size > 0) {
        // We have column restrictions, need to select specific columns
        allowedColumns = []; // Will be populated by result filtering
      }
    }

    // Escape table name to prevent SQL injection (basic escaping)
    const safeTable = table.replace(/[^a-zA-Z0-9_]/g, '');
    const sql = `SELECT * FROM ${safeTable} LIMIT ${Math.min(limit, 1000)}`;

    const result = await executeQuery(connection, sql, Math.min(limit, 1000));
    
    // Filter columns if there are restrictions
    if (teamId && result.columns && result.columns.length > 0) {
      const permission = await getEffectivePermissions(user.id, teamId, connectionId);
      const columnNames = result.columns.map(c => c.name);
      const filteredColumnNames = filterAllowedColumns(table, columnNames, permission);
      
      // Filter columns and rows
      result.columns = result.columns.filter(c => filteredColumnNames.includes(c.name));
      result.rows = result.rows.map(row => {
        const filteredRow: Record<string, unknown> = {};
        for (const colName of filteredColumnNames) {
          filteredRow[colName] = row[colName];
        }
        return filteredRow;
      });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch table preview:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch table preview' },
      { status: 500 }
    );
  }
}
