import { cookies } from 'next/headers';
import { generateCSRFToken } from '@/lib/security/csrf';

/**
 * Server component that renders a CSRF token meta tag
 * The token is tied to the user's session
 */
export async function CSRFTokenMeta() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('scurrydb_session')?.value;
  
  if (!sessionId) {
    // No session, no CSRF token needed
    return null;
  }
  
  const csrfToken = generateCSRFToken(sessionId);
  
  return <meta name="csrf-token" content={csrfToken} />;
}
