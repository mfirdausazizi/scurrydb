import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { savedQuerySchema } from '@/lib/validations/team';
import { getSavedQueryById, updateSavedQuery, deleteSavedQuery, canUserAccessQuery, canUserModifyQuery } from '@/lib/db/queries';
import { logActivity } from '@/lib/db/activities';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    if (!canUserAccessQuery(user.id, id)) {
      return NextResponse.json({ error: 'Query not found' }, { status: 404 });
    }

    const query = getSavedQueryById(id);
    if (!query) {
      return NextResponse.json({ error: 'Query not found' }, { status: 404 });
    }

    return NextResponse.json(query);
  } catch (error) {
    console.error('Failed to get query:', error);
    return NextResponse.json({ error: 'Failed to get query' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    if (!canUserModifyQuery(user.id, id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = savedQuerySchema.partial().safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const existingQuery = getSavedQueryById(id);
    const query = updateSavedQuery(id, validationResult.data);
    if (!query) {
      return NextResponse.json({ error: 'Query not found' }, { status: 404 });
    }

    // Log activity
    logActivity({
      teamId: query.teamId,
      userId: user.id,
      action: 'query_updated',
      resourceType: 'query',
      resourceId: query.id,
      metadata: { queryName: query.name },
    });

    // If query was just shared with a team, log that too
    if (!existingQuery?.teamId && query.teamId) {
      logActivity({
        teamId: query.teamId,
        userId: user.id,
        action: 'query_shared',
        resourceType: 'query',
        resourceId: query.id,
        metadata: { queryName: query.name },
      });
    }

    return NextResponse.json(query);
  } catch (error) {
    console.error('Failed to update query:', error);
    return NextResponse.json({ error: 'Failed to update query' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    if (!canUserModifyQuery(user.id, id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const query = getSavedQueryById(id);
    const deleted = deleteSavedQuery(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Query not found' }, { status: 404 });
    }

    // Log activity
    if (query) {
      logActivity({
        teamId: query.teamId,
        userId: user.id,
        action: 'query_deleted',
        resourceType: 'query',
        resourceId: id,
        metadata: { queryName: query.name },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete query:', error);
    return NextResponse.json({ error: 'Failed to delete query' }, { status: 500 });
  }
}
