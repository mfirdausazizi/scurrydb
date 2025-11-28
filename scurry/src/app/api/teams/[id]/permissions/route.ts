import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserRoleInTeam, canManageTeam } from '@/lib/db/teams';
import {
  getTeamPermissionProfiles,
  createPermissionProfile,
} from '@/lib/db/permissions';
import { permissionProfileSchema } from '@/lib/validations/team';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const profiles = await getTeamPermissionProfiles(id);
    return NextResponse.json(profiles);
  } catch (error) {
    console.error('Failed to get permission profiles:', error);
    return NextResponse.json(
      { error: 'Failed to get permission profiles' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const role = await getUserRoleInTeam(id, user.id);
    
    // Only owners and admins can create permission profiles
    if (!canManageTeam(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = permissionProfileSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const profile = await createPermissionProfile({
      teamId: id,
      name: validationResult.data.name,
      description: validationResult.data.description,
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    console.error('Failed to create permission profile:', error);
    return NextResponse.json(
      { error: 'Failed to create permission profile' },
      { status: 500 }
    );
  }
}

