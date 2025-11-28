import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { acceptTeamInvitation, getTeamInvitationByToken } from '@/lib/db/teams';

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await params;

    // Verify the invitation exists and is valid
    const invitation = await getTeamInvitationByToken(token);
    if (!invitation) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 });
    }

    // Check if the invitation email matches the user's email
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invitation was sent to a different email address' },
        { status: 403 }
      );
    }

    const member = await acceptTeamInvitation(token, user.id);
    if (!member) {
      return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      team: invitation.team,
      member,
    });
  } catch (error) {
    console.error('Failed to accept invitation:', error);
    return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    const invitation = await getTeamInvitationByToken(token);
    if (!invitation) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 });
    }

    return NextResponse.json({
      teamName: invitation.team?.name,
      teamSlug: invitation.team?.slug,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    });
  } catch (error) {
    console.error('Failed to get invitation:', error);
    return NextResponse.json({ error: 'Failed to get invitation' }, { status: 500 });
  }
}
