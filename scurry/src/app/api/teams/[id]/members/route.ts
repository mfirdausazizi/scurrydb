import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { inviteMemberSchema } from '@/lib/validations/team';
import {
  getTeamMembers,
  getUserRoleInTeam,
  canManageTeam,
  createTeamInvitation,
  getPendingInvitationForEmail,
  addTeamMember,
} from '@/lib/db/teams';
import { getUserByEmail } from '@/lib/db/app-db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const role = getUserRoleInTeam(id, user.id);
    if (!role) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const members = getTeamMembers(id);
    return NextResponse.json(members);
  } catch (error) {
    console.error('Failed to get team members:', error);
    return NextResponse.json({ error: 'Failed to get team members' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const role = getUserRoleInTeam(id, user.id);
    if (!canManageTeam(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = inviteMemberSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { email, role: memberRole } = validationResult.data;

    // Check if there's already a pending invitation
    const existingInvitation = getPendingInvitationForEmail(id, email);
    if (existingInvitation) {
      return NextResponse.json({ error: 'An invitation has already been sent to this email' }, { status: 409 });
    }

    // Check if the user exists and add them directly, otherwise create invitation
    const existingUser = getUserByEmail(email);
    if (existingUser) {
      // Check if user is already a member
      const existingMemberRole = getUserRoleInTeam(id, existingUser.id);
      if (existingMemberRole) {
        return NextResponse.json({ error: 'User is already a team member' }, { status: 409 });
      }

      // Add directly as member
      const member = addTeamMember({
        teamId: id,
        userId: existingUser.id,
        role: memberRole,
        invitedBy: user.id,
      });

      return NextResponse.json({ type: 'member', data: member }, { status: 201 });
    }

    // Create invitation for non-existing user
    const invitation = createTeamInvitation({
      teamId: id,
      email,
      role: memberRole,
      invitedBy: user.id,
    });

    return NextResponse.json({ type: 'invitation', data: invitation }, { status: 201 });
  } catch (error) {
    console.error('Failed to invite member:', error);
    return NextResponse.json({ error: 'Failed to invite member' }, { status: 500 });
  }
}
