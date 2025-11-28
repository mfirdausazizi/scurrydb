import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserActivityFeed } from '@/lib/db/activities';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const activities = getUserActivityFeed(user.id, {
      teamId: teamId || undefined,
      limit: Math.min(limit, 100),
      offset,
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error('Failed to get activities:', error);
    return NextResponse.json({ error: 'Failed to get activities' }, { status: 500 });
  }
}
