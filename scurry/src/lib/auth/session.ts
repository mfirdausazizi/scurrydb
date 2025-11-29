import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { 
  createSession, 
  getValidSession, 
  deleteSession, 
  getUserById, 
  getUserSessions,
  deleteAllUserSessions,
  type User, 
  type Session 
} from '@/lib/db/app-db';

const SESSION_COOKIE_NAME = 'scurrydb_session';
const SESSION_DURATION_DAYS = 30;
const SESSION_ROTATION_DAYS = 7; // Rotate session after 7 days

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

/**
 * Rotates the current session by creating a new one and deleting the old one
 * This should be called after sensitive operations like password change
 */
export async function rotateSession(oldSessionId: string, userId: string): Promise<Session> {
  // Delete the old session
  await deleteSession(oldSessionId);
  
  // Create a new session
  const newSession = await createUserSession(userId);
  
  return newSession;
}

/**
 * Checks if a session should be rotated based on its age
 */
export function shouldRotateSession(session: Session): boolean {
  const createdAt = new Date(session.createdAt);
  const now = new Date();
  const ageInDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  
  return ageInDays >= SESSION_ROTATION_DAYS;
}

/**
 * Gets all active sessions for a user
 */
export async function listUserSessions(userId: string): Promise<Session[]> {
  return getUserSessions(userId);
}

/**
 * Logs out from all devices by deleting all sessions for a user
 */
export async function logoutAllDevices(userId: string, keepCurrentSession?: string): Promise<number> {
  if (keepCurrentSession) {
    // Get all sessions except current
    const sessions = await getUserSessions(userId);
    let deletedCount = 0;
    
    for (const session of sessions) {
      if (session.id !== keepCurrentSession) {
        await deleteSession(session.id);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }
  
  // Delete all sessions
  return deleteAllUserSessions(userId);
}

/**
 * Invalidates a specific session by ID
 * Used for "log out this device" functionality
 */
export async function invalidateSessionById(
  sessionId: string, 
  userId: string
): Promise<boolean> {
  // Verify the session belongs to the user
  const session = await getValidSession(sessionId);
  if (!session || session.userId !== userId) {
    return false;
  }
  
  await deleteSession(sessionId);
  return true;
}

/**
 * Session info for display purposes (hides sensitive data)
 */
export interface SessionInfo {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  isCurrent: boolean;
  // Additional info can be added: userAgent, ipAddress, location, etc.
}

/**
 * Gets session info for display in the UI
 */
export async function getSessionsForDisplay(
  userId: string, 
  currentSessionId?: string
): Promise<SessionInfo[]> {
  const sessions = await getUserSessions(userId);
  
  return sessions.map(session => ({
    id: session.id,
    createdAt: new Date(session.createdAt),
    expiresAt: new Date(session.expiresAt),
    isCurrent: session.id === currentSessionId,
  }));
}
