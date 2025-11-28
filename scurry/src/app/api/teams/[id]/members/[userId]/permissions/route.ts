import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserRoleInTeam, canManageTeam } from '@/lib/db/teams';
import {
  getMemberPermissionAssignment,
  assignMemberPermission,
  deleteMemberPermissionAssignment,
} from '@/lib/db/permissions';
import { memberPermissionAssignmentSchema } from '@/lib/validations/team';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, userId } = await params;
    const role = await getUserRoleInTeam(id, user.id);
    if (!role) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const assignment = await getMemberPermissionAssignment(id, userId);
    if (!assignment) {
      return NextResponse.json({ error: 'No permission assignment found' }, { status: 404 });
    }

    return NextResponse.json(assignment);
  } catch (error) {
    console.error('Failed to get member permission assignment:', error);
    return NextResponse.json(
      { error: 'Failed to get member permission assignment' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, userId } = await params;
    const role = await getUserRoleInTeam(id, user.id);
    
    if (!canManageTeam(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = memberPermissionAssignmentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const assignment = await assignMemberPermission({
      teamId: id,
      userId,
      profileId: validationResult.data.profileId,
      customPermissions: validationResult.data.customPermissions,
    });

    return NextResponse.json(assignment);
  } catch (error) {
    console.error('Failed to assign member permission:', error);
    return NextResponse.json(
      { error: 'Failed to assign member permission' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, userId } = await params;
    const role = await getUserRoleInTeam(id, user.id);
    
    if (!canManageTeam(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteMemberPermissionAssignment(id, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete member permission assignment:', error);
    return NextResponse.json(
      { error: 'Failed to delete member permission assignment' },
      { status: 500 }
    );
  }
}

