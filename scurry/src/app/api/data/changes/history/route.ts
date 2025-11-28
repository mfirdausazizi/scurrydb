import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getConnectionById } from '@/lib/db/app-db';
import { getDataChangeLogs } from '@/lib/db/data-changes';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');
    const tableName = searchParams.get('tableName');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Missing required parameter: connectionId' },
        { status: 400 }
      );
    }

    // Verify user has access to this connection
    const connection = await getConnectionById(connectionId, user.id);
    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    const logs = await getDataChangeLogs({
      connectionId,
      tableName: tableName || undefined,
      limit,
      offset,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching change history:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch change history' },
      { status: 500 }
    );
  }
}
