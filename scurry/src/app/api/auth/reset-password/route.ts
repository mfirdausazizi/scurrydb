import { NextRequest, NextResponse } from 'next/server';
import { resetPasswordSchema } from '@/lib/validations/auth';
import { hashPassword } from '@/lib/auth/password';
import {
  getValidPasswordResetToken,
  markPasswordResetTokenAsUsed,
  getUserById,
  updateUser,
} from '@/lib/db/app-db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = resetPasswordSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      const firstError =
        errors.token?.[0] ||
        errors.password?.[0] ||
        errors.confirmPassword?.[0] ||
        'Invalid request';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { token, password } = validationResult.data;

    // Find valid token
    const resetToken = await getValidPasswordResetToken(token);
    if (!resetToken) {
      return NextResponse.json(
        { error: 'Invalid or expired reset link. Please request a new one.' },
        { status: 400 }
      );
    }

    // Find user
    const user = await getUserById(resetToken.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 400 }
      );
    }

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update user password
    await updateUser(user.id, { passwordHash });

    // Mark token as used
    await markPasswordResetTokenAsUsed(token);

    return NextResponse.json({
      message: 'Password has been reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password. Please try again.' },
      { status: 500 }
    );
  }
}

// GET endpoint to validate token before showing reset form
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'No reset token provided' },
        { status: 400 }
      );
    }

    const resetToken = await getValidPasswordResetToken(token);
    if (!resetToken) {
      return NextResponse.json(
        { valid: false, error: 'Invalid or expired reset link' },
        { status: 400 }
      );
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json(
      { valid: false, error: 'Failed to validate token' },
      { status: 500 }
    );
  }
}
