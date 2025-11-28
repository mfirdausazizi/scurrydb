import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { createSession, getValidSession, deleteSession, getUserById, type User, type Session } from '@/lib/db/app-db';

const SESSION_COOKIE_NAME = 'scurrydb_session';
const SESSION_DURATION_DAYS = 30;

export async function createUserSession(userId: string): Promise<Session> {
  const sessionId = uuidv4();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);
  
  const session = await createSession({
    id: sessionId,
    userId,
    expiresAt,
  });
  
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
  
  return session;
}

export async function getCurrentSession(): Promise<{ session: Session; user: User } | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  
  if (!sessionId) {
    return null;
  }
  
  const session = await getValidSession(sessionId);
  if (!session) {
    return null;
  }
  
  const user = await getUserById(session.userId);
  if (!user) {
    return null;
  }
  
  return { session, user };
}

export async function getCurrentUser(): Promise<User | null> {
  const result = await getCurrentSession();
  return result?.user ?? null;
}

export async function invalidateSession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  
  if (sessionId) {
    await deleteSession(sessionId);
    cookieStore.delete(SESSION_COOKIE_NAME);
  }
}

export async function requireAuth(): Promise<{ session: Session; user: User }> {
  const result = await getCurrentSession();
  if (!result) {
    throw new Error('Unauthorized');
  }
  return result;
}
