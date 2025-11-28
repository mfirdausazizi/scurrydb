import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserRoleInTeam, canManageTeam } from '@/lib/db/teams';
import {
  getPermissionProfile,
  updatePermissionProfile,
  deletePermissionProfile,
  getProfileConnectionPermissions,
  getProfileColumnRestrictions,
} from '@/lib/db/permissions';
import { permissionProfileSchema } from '@/lib/validations/team';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; profileId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, profileId } = await params;
    const role = await getUserRoleInTeam(id, user.id);
    if (!role) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const profile = await getPermissionProfile(profileId);
    if (!profile || profile.teamId !== id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get connection permissions
    const connectionPermissions = await getProfileConnectionPermissions(profileId);
    
    // Get column restrictions for each connection permission
    const connectionsWithRestrictions = await Promise.all(
      connectionPermissions.map(async (connPerm) => {
        const columnRestrictions = await getProfileColumnRestrictions(connPerm.id);
        return {
          ...connPerm,
          columnRestrictions,
        };
      })
    );

    return NextResponse.json({
      ...profile,
      connections: connectionsWithRestrictions,
    });
  } catch (error) {
    console.error('Failed to get permission profile:', error);
    return NextResponse.json(
      { error: 'Failed to get permission profile' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; profileId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, profileId } = await params;
    const role = await getUserRoleInTeam(id, user.id);
    
    if (!canManageTeam(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const profile = await getPermissionProfile(profileId);
    if (!profile || profile.teamId !== id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const validationResult = permissionProfileSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updatePermissionProfile(profileId, {
      name: validationResult.data.name,
      description: validationResult.data.description,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update permission profile:', error);
    return NextResponse.json(
      { error: 'Failed to update permission profile' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; profileId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, profileId } = await params;
    const role = await getUserRoleInTeam(id, user.id);
    
    if (!canManageTeam(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const profile = await getPermissionProfile(profileId);
    if (!profile || profile.teamId !== id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    await deletePermissionProfile(profileId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete permission profile:', error);
    return NextResponse.json(
      { error: 'Failed to delete permission profile' },
      { status: 500 }
    );
  }
}

