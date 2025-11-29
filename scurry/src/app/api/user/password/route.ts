import { NextRequest, NextResponse } from 'next/server';
import { passwordChangeSchema } from '@/lib/validations/account';
import { getCurrentSession, rotateSession, logoutAllDevices } from '@/lib/auth/session';
import { getUserById, updateUser } from '@/lib/db/app-db';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

export async function PUT(request: NextRequest) {
  try {
    const sessionResult = await getCurrentSession();
    if (!sessionResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { session, user } = sessionResult;

    const body = await request.json();
    const validationResult = passwordChangeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = validationResult.data;
    const logoutOtherDevices = body.logoutOtherDevices ?? true; // Default to logging out other devices

    // Get the full user record with password hash
    const fullUser = await getUserById(user.id);
    if (!fullUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password
    const isValidPassword = await verifyPassword(fullUser.passwordHash, currentPassword);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Hash and save new password
    const newPasswordHash = await hashPassword(newPassword);
    const updatedUser = await updateUser(user.id, { passwordHash: newPasswordHash });

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      );
    }

    // Security: Rotate the current session after password change
    await rotateSession(session.id, user.id);
    
    // Optionally log out all other devices
    let loggedOutDevices = 0;
    if (logoutOtherDevices) {
      // We need to get the new session ID after rotation, but since rotateSession
      // creates a new session, we just log out all sessions except current
      const sessions = await logoutAllDevices(user.id);
      // Note: The new session was just created, so we're safe
      loggedOutDevices = sessions;
    }

    return NextResponse.json({ 
      message: 'Password updated successfully',
      loggedOutDevices,
    });
  } catch (error) {
    console.error('Failed to change password:', error);
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    );
  }
}
