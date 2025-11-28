import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { queryCommentSchema } from '@/lib/validations/team';
import { createComment, getQueryComments, deleteComment, getCommentById } from '@/lib/db/comments';
import { canUserAccessQuery, getSavedQueryById } from '@/lib/db/queries';
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

    const comments = getQueryComments(id);
    return NextResponse.json(comments);
  } catch (error) {
    console.error('Failed to get comments:', error);
    return NextResponse.json({ error: 'Failed to get comments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    if (!canUserAccessQuery(user.id, id)) {
      return NextResponse.json({ error: 'Query not found' }, { status: 404 });
    }

    const body = await request.json();
    const validationResult = queryCommentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { content } = validationResult.data;
    const query = getSavedQueryById(id);

    const comment = createComment({
      queryId: id,
      userId: user.id,
      content,
    });

    // Log activity
    if (query) {
      logActivity({
        teamId: query.teamId,
        userId: user.id,
        action: 'comment_added',
        resourceType: 'comment',
        resourceId: comment.id,
        metadata: { queryName: query.name, queryId: id },
      });
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Failed to add comment:', error);
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
    }

    const comment = getCommentById(commentId);
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Only the comment author can delete
    if (comment.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const deleted = deleteComment(commentId);
    if (!deleted) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete comment:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
