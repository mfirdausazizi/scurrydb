import { NextRequest, NextResponse } from 'next/server';
import { passwordChangeSchema } from '@/lib/validations/account';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserById, updateUser } from '@/lib/db/app-db';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = passwordChangeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = validationResult.data;

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

    return NextResponse.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Failed to change password:', error);
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    );
  }
}
