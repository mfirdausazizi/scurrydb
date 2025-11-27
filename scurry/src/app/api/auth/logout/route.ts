import { NextResponse } from 'next/server';
import { invalidateSession } from '@/lib/auth/session';

export async function POST() {
  try {
    await invalidateSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to log out' },
      { status: 500 }
    );
  }
}
