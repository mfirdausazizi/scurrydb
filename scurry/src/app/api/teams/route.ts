import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createTeamSchema } from '@/lib/validations/team';
import { createTeam, getUserTeams, isTeamSlugAvailable } from '@/lib/db/teams';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teams = getUserTeams(user.id);
    return NextResponse.json(teams);
  } catch (error) {
    console.error('Failed to get teams:', error);
    return NextResponse.json({ error: 'Failed to get teams' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = createTeamSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, slug } = validationResult.data;

    // Check if slug is available
    if (!isTeamSlugAvailable(slug)) {
      return NextResponse.json({ error: 'Team slug is already taken' }, { status: 409 });
    }

    const team = createTeam({ name, slug, ownerId: user.id });
    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    console.error('Failed to create team:', error);
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
  }
}
