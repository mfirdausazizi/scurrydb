import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { updateMemberRoleSchema } from '@/lib/validations/team';
import {
  getUserRoleInTeam,
  canManageTeam,
  updateTeamMemberRole,
  removeTeamMember,
  getTeamById,
} from '@/lib/db/teams';

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
    const currentUserRole = getUserRoleInTeam(id, user.id);
    if (!canManageTeam(currentUserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = updateMemberRoleSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { role } = validationResult.data;

    // Cannot change the owner's role
    const team = getTeamById(id);
    if (team && team.ownerId === userId) {
      return NextResponse.json({ error: 'Cannot change the owner\'s role' }, { status: 400 });
    }

    // Admin cannot promote someone to admin unless they are the owner
    if (role === 'admin' && currentUserRole !== 'owner') {
      return NextResponse.json({ error: 'Only the owner can promote members to admin' }, { status: 403 });
    }

    const member = updateTeamMemberRole(id, userId, role);
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    return NextResponse.json(member);
  } catch (error) {
    console.error('Failed to update member role:', error);
    return NextResponse.json({ error: 'Failed to update member role' }, { status: 500 });
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
    
    // User can remove themselves, or admins/owners can remove others
    const currentUserRole = getUserRoleInTeam(id, user.id);
    const isRemovingSelf = user.id === userId;
    
    if (!isRemovingSelf && !canManageTeam(currentUserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Cannot remove the owner
    const team = getTeamById(id);
    if (team && team.ownerId === userId) {
      return NextResponse.json({ error: 'Cannot remove the team owner' }, { status: 400 });
    }

    const removed = removeTeamMember(id, userId);
    if (!removed) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to remove member:', error);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
