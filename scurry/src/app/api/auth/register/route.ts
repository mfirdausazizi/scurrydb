import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { registerSchema } from '@/lib/validations/auth';
import { hashPassword } from '@/lib/auth/password';
import { createUserSession } from '@/lib/auth/session';
import { createUser, getUserByEmail } from '@/lib/db/app-db';
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

    const validationResult = registerSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, password } = validationResult.data;

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = await createUser({
      id: uuidv4(),
      email: email.toLowerCase(),
      passwordHash,
      name,
    });

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
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register. Please try again.' },
      { status: 500 }
    );
  }
}
