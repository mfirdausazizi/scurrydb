import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getConnectionById } from '@/lib/db/app-db';
import {
  getConnectionShares,
  shareConnection,
  unshareConnection,
  getUserTeams,
  canManageTeam,
  getUserRoleInTeam,
} from '@/lib/db/teams';
import { connectionPermissions, type ConnectionPermission } from '@/lib/validations/team';

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/connections/[id]/share - Get all teams this connection is shared with
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify user owns this connection
    const connection = await getConnectionById(id, user.id);
    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Get all teams this connection is shared with
    const shares = await getConnectionShares(id, user.id);

    // Also get all teams the user can share to (teams where they can manage)
    const userTeams = await getUserTeams(user.id);
    const teamsUserCanShareTo = [];

    for (const team of userTeams) {
      // Only admins and owners can share connections to teams
      const role = await getUserRoleInTeam(team.id, user.id);
      if (canManageTeam(role)) {
        teamsUserCanShareTo.push({
          teamId: team.id,
          teamName: team.name,
        });
      }
    }

    return NextResponse.json({
      shares,
      availableTeams: teamsUserCanShareTo,
    });
  } catch (error) {
    console.error('Failed to get connection shares:', error);
    return NextResponse.json(
      { error: 'Failed to get connection shares' },
      { status: 500 }
    );
  }
}

// POST /api/connections/[id]/share - Share connection with a team
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { teamId, permission } = body;

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    if (!permission || !connectionPermissions.includes(permission)) {
      return NextResponse.json(
        { error: 'Invalid permission. Must be "read" or "write"' },
        { status: 400 }
      );
    }

    // Verify user owns this connection
    const connection = await getConnectionById(id, user.id);
    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Verify user can share to this team (must be admin or owner)
    const role = await getUserRoleInTeam(teamId, user.id);
    if (!canManageTeam(role)) {
      return NextResponse.json(
        { error: 'You do not have permission to share to this team' },
        { status: 403 }
      );
    }

    // Share the connection
    const shared = await shareConnection({
      connectionId: id,
      teamId,
      sharedBy: user.id,
      permission: permission as ConnectionPermission,
    });

    return NextResponse.json(shared);
  } catch (error) {
    console.error('Failed to share connection:', error);
    return NextResponse.json(
      { error: 'Failed to share connection' },
      { status: 500 }
    );
  }
}

// DELETE /api/connections/[id]/share - Unshare connection from a team
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    // Verify user owns this connection
    const connection = await getConnectionById(id, user.id);
    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Unshare the connection
    const removed = await unshareConnection(id, teamId);
    if (!removed) {
      return NextResponse.json({ error: 'Shared connection not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to unshare connection:', error);
    return NextResponse.json(
      { error: 'Failed to unshare connection' },
      { status: 500 }
    );
  }
}
