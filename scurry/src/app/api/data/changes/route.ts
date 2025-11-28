import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getConnectionById } from '@/lib/db/app-db';
import { applyDataChanges } from '@/lib/db/data-changes';
import { logActivity } from '@/lib/db/activities';
import type { ApplyChangesRequest } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ApplyChangesRequest = await request.json();
    const { connectionId, tableName, primaryKeyColumns, changes } = body;

    if (!connectionId || !tableName || !primaryKeyColumns || !changes) {
      return NextResponse.json(
        { error: 'Missing required fields: connectionId, tableName, primaryKeyColumns, changes' },
        { status: 400 }
      );
    }

    const connection = await getConnectionById(connectionId, user.id);
    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    const result = await applyDataChanges(
      connection,
      tableName,
      primaryKeyColumns,
      changes,
      user.id
    );

    // Log activity for successful changes
    if (result.insertedCount > 0) {
      await logActivity({
        userId: user.id,
        action: 'data_inserted',
        resourceType: 'connection',
        resourceId: connectionId,
        metadata: {
          tableName,
          rowCount: result.insertedCount,
          connectionName: connection.name,
        },
      });
    }

    if (result.updatedCount > 0) {
      await logActivity({
        userId: user.id,
        action: 'data_updated',
        resourceType: 'connection',
        resourceId: connectionId,
        metadata: {
          tableName,
          rowCount: result.updatedCount,
          connectionName: connection.name,
        },
      });
    }

    if (result.deletedCount > 0) {
      await logActivity({
        userId: user.id,
        action: 'data_deleted',
        resourceType: 'connection',
        resourceId: connectionId,
        metadata: {
          tableName,
          rowCount: result.deletedCount,
          connectionName: connection.name,
        },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error applying changes:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to apply changes' },
      { status: 500 }
    );
  }
}
