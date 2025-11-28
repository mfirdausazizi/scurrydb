import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { shareConnectionSchema } from '@/lib/validations/team';
import {
  getUserRoleInTeam,
  canManageTeam,
  getTeamSharedConnections,
  shareConnection,
  unshareConnection,
} from '@/lib/db/teams';
import { getConnectionById } from '@/lib/db/app-db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const role = await getUserRoleInTeam(id, user.id);
    if (!role) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const connections = await getTeamSharedConnections(id);
    
    // Don't expose passwords in the response
    const sanitized = connections.map((sc) => ({
      ...sc,
      connection: sc.connection
        ? {
            ...sc.connection,
            password: undefined,
          }
        : undefined,
    }));

    return NextResponse.json(sanitized);
  } catch (error) {
    console.error('Failed to get shared connections:', error);
    return NextResponse.json({ error: 'Failed to get shared connections' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const role = await getUserRoleInTeam(id, user.id);
    
    // Members and above can share connections
    if (!role || role === 'viewer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = shareConnectionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { connectionId, permission } = validationResult.data;

    // Verify the user owns this connection
    const connection = await getConnectionById(connectionId, user.id);
    if (!connection) {
      return NextResponse.json({ error: 'Connection not found or you do not own it' }, { status: 404 });
    }

    const shared = await shareConnection({
      connectionId,
      teamId: id,
      sharedBy: user.id,
      permission,
    });

    return NextResponse.json({
      ...shared,
      connection: {
        ...shared.connection,
        password: undefined,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to share connection:', error);
    return NextResponse.json({ error: 'Failed to share connection' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const role = await getUserRoleInTeam(id, user.id);
    if (!canManageTeam(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');
    
    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 });
    }

    const removed = await unshareConnection(connectionId, id);
    if (!removed) {
      return NextResponse.json({ error: 'Shared connection not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to unshare connection:', error);
    return NextResponse.json({ error: 'Failed to unshare connection' }, { status: 500 });
  }
}
