import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { forgotPasswordSchema } from '@/lib/validations/auth';
import { getUserByEmail, createPasswordResetToken, invalidateUserPasswordResetTokens } from '@/lib/db/app-db';
import { sendEmail, isEmailConfigured, getPasswordResetEmailTemplate } from '@/lib/email';
import { performSpamCheck, getClientIP } from '@/lib/auth/spam-protection';

function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Spam protection check
    const spamCheck = await performSpamCheck(
      body._hp,
      body._turnstile,
      getClientIP(request)
    );
    if (!spamCheck.passed) {
      return NextResponse.json(
        { error: spamCheck.error || 'Verification failed' },
        { status: 400 }
      );
    }

    const validationResult = forgotPasswordSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    const { email } = validationResult.data;

    // Always return success to prevent email enumeration
    const successResponse = NextResponse.json({
      message: 'If an account with that email exists, we have sent a password reset link.',
    });

    // Check if email is configured
    if (!isEmailConfigured()) {
      console.warn('SMTP not configured. Password reset email not sent for:', email);
      return successResponse;
    }

    // Find user
    const user = await getUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return successResponse;
    }

    // Invalidate any existing tokens for this user
    await invalidateUserPasswordResetTokens(user.id);

    // Generate new token
    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    await createPasswordResetToken({
      id: uuidv4(),
      userId: user.id,
      token,
      expiresAt,
    });

    // Build reset URL
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    // Send email
    const emailTemplate = getPasswordResetEmailTemplate(user.name || '', resetLink);
    await sendEmail({
      to: user.email,
      ...emailTemplate,
    });

    return successResponse;
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process request. Please try again.' },
      { status: 500 }
    );
  }
}
