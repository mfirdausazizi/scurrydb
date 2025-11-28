import { NextRequest, NextResponse } from 'next/server';
import { getConnectionById } from '@/lib/db/app-db';
import { fetchTables } from '@/lib/db/schema-fetcher';
import { getCurrentUser } from '@/lib/auth/session';
import { getEffectivePermissions } from '@/lib/db/permissions';
import { filterAllowedTables } from '@/lib/permissions/validator';
import { validateConnectionAccess } from '@/lib/db/teams';

export async function GET(request: NextRequest) {
  try {
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

    const tables = await fetchTables(connection);
    
    // Filter tables based on permissions if this is a team connection
    if (teamId) {
      const permission = await getEffectivePermissions(user.id, teamId, connectionId);
      const tableNames = tables.map(t => t.name);
      const allowedTableNames = filterAllowedTables(tableNames, permission);
      const filteredTables = tables.filter(t => allowedTableNames.includes(t.name));
      return NextResponse.json(filteredTables);
    }
    
    return NextResponse.json(tables);
  } catch (error) {
    console.error('Failed to fetch tables:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch tables' },
      { status: 500 }
    );
  }
}
