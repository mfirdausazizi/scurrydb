import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { savedQuerySchema } from '@/lib/validations/team';
import { createSavedQuery, getUserSavedQueries } from '@/lib/db/queries';
import { logActivity } from '@/lib/db/activities';
import { getUserRoleInTeam } from '@/lib/db/teams';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const includeTeamQueries = searchParams.get('includeTeam') === 'true';

    const queries = getUserSavedQueries(user.id, {
      teamId: teamId || undefined,
      includeTeamQueries,
    });

    return NextResponse.json(queries);
  } catch (error) {
    console.error('Failed to get saved queries:', error);
    return NextResponse.json({ error: 'Failed to get saved queries' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = savedQuerySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, description, sql, connectionId, teamId, isPublic } = validationResult.data;

    // If sharing with a team, verify user has access
    if (teamId) {
      const role = getUserRoleInTeam(teamId, user.id);
      if (!role || role === 'viewer') {
        return NextResponse.json({ error: 'Cannot save queries to this team' }, { status: 403 });
      }
    }

    const query = createSavedQuery({
      userId: user.id,
      teamId: teamId || null,
      connectionId: connectionId || null,
      name,
      description: description || null,
      sql,
      isPublic: isPublic || false,
    });

    // Log activity
    logActivity({
      teamId: teamId || null,
      userId: user.id,
      action: teamId ? 'query_shared' : 'query_saved',
      resourceType: 'query',
      resourceId: query.id,
      metadata: { queryName: name },
    });

    return NextResponse.json(query, { status: 201 });
  } catch (error) {
    console.error('Failed to save query:', error);
    return NextResponse.json({ error: 'Failed to save query' }, { status: 500 });
  }
}
