import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import {
  getTeamInvitations,
  getUserRoleInTeam,
  canManageTeam,
  deleteTeamInvitation,
} from '@/lib/db/teams';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const invitations = getTeamInvitations(id);
    return NextResponse.json(invitations);
  } catch (error) {
    console.error('Failed to get invitations:', error);
    return NextResponse.json({ error: 'Failed to get invitations' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get('invitationId');
    
    if (!invitationId) {
      return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 });
    }

    const deleted = deleteTeamInvitation(invitationId);
    if (!deleted) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete invitation:', error);
    return NextResponse.json({ error: 'Failed to delete invitation' }, { status: 500 });
  }
}
