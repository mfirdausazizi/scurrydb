import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validations/auth';
import { verifyPassword } from '@/lib/auth/password';
import { createUserSession } from '@/lib/auth/session';
import { getUserByEmail } from '@/lib/db/app-db';
import { performSpamCheck, getClientIP } from '@/lib/auth/spam-protection';

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

    const validationResult = loginSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

    // Find user
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(user.passwordHash, password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create session
    await createUserSession(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Failed to log in. Please try again.' },
      { status: 500 }
    );
  }
}
