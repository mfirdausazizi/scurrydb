/**
 * CSRF (Cross-Site Request Forgery) Protection
 * 
 * Generates and validates CSRF tokens tied to user sessions.
 * Uses HMAC-based token generation for security.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

// CSRF secret - should be set via environment variable
const CSRF_SECRET = process.env.CSRF_SECRET || process.env.ENCRYPTION_KEY || 'default-csrf-secret-change-in-production';

// Token validity period (4 hours)
const TOKEN_VALIDITY_MS = 4 * 60 * 60 * 1000;

/**
 * Generates a CSRF token for a session
 * Token format: base64(sessionId:timestamp:signature)
 */
export function generateCSRFToken(sessionId: string): string {
  const timestamp = Date.now();
  const data = `${sessionId}:${timestamp}`;
  
  const signature = createHmac('sha256', CSRF_SECRET)
    .update(data)
    .digest('hex');
  
  const token = Buffer.from(`${data}:${signature}`).toString('base64');
  return token;
}

/**
 * Verifies a CSRF token
 * @param token - The CSRF token to verify
 * @param sessionId - The session ID to validate against
 * @returns true if valid, false otherwise
 */
export function verifyCSRFToken(token: string | null | undefined, sessionId: string): boolean {
  if (!token || !sessionId) {
    return false;
  }
  
  try {
    // Decode the token
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parts = decoded.split(':');
    
    if (parts.length !== 3) {
      return false;
    }
    
    const [tokenSessionId, timestampStr, providedSignature] = parts;
    const timestamp = parseInt(timestampStr, 10);
    
    // Verify session ID matches
    if (tokenSessionId !== sessionId) {
      return false;
    }
    
    // Check if token is expired
    if (Date.now() - timestamp > TOKEN_VALIDITY_MS) {
      return false;
    }
    
    // Regenerate signature and compare
    const data = `${tokenSessionId}:${timestamp}`;
    const expectedSignature = createHmac('sha256', CSRF_SECRET)
      .update(data)
      .digest('hex');
    
    // Use timing-safe comparison to prevent timing attacks
    const providedBuffer = Buffer.from(providedSignature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    
    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }
    
    return timingSafeEqual(providedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Creates a new CSRF token with a random nonce
 * More secure but requires server-side storage
 */
export function generateSecureCSRFToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('hex');
  const hash = createHmac('sha256', CSRF_SECRET)
    .update(token)
    .digest('hex');
  
  return { token, hash };
}

/**
 * Verifies a secure CSRF token against its hash
 */
export function verifySecureCSRFToken(token: string, hash: string): boolean {
  if (!token || !hash) {
    return false;
  }
  
  try {
    const expectedHash = createHmac('sha256', CSRF_SECRET)
      .update(token)
      .digest('hex');
    
    const providedBuffer = Buffer.from(hash, 'utf8');
    const expectedBuffer = Buffer.from(expectedHash, 'utf8');
    
    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }
    
    return timingSafeEqual(providedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Extracts CSRF token from request headers
 */
export function getCSRFTokenFromRequest(request: Request): string | null {
  // Check header first
  const headerToken = request.headers.get('X-CSRF-Token');
  if (headerToken) {
    return headerToken;
  }
  
  // Also check alternative header names
  const altToken = request.headers.get('X-XSRF-Token');
  if (altToken) {
    return altToken;
  }
  
  return null;
}

/**
 * HTTP methods that require CSRF validation
 */
export const CSRF_PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Routes that are exempt from CSRF protection
 * (e.g., public API endpoints, webhooks)
 */
export const CSRF_EXEMPT_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/webhooks/',
];

/**
 * Checks if a route is exempt from CSRF protection
 */
export function isCSRFExempt(pathname: string): boolean {
  return CSRF_EXEMPT_ROUTES.some(route => 
    pathname.startsWith(route) || pathname === route
  );
}

/**
 * Validates CSRF token for a request
 */
export function validateCSRFRequest(
  request: Request,
  sessionId: string | null
): { valid: boolean; error?: string } {
  const method = request.method;
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Skip validation for safe methods
  if (!CSRF_PROTECTED_METHODS.includes(method)) {
    return { valid: true };
  }
  
  // Skip validation for exempt routes
  if (isCSRFExempt(pathname)) {
    return { valid: true };
  }
  
  // Require session for CSRF validation
  if (!sessionId) {
    return { valid: false, error: 'No session found' };
  }
  
  // Get and validate token
  const token = getCSRFTokenFromRequest(request);
  if (!token) {
    return { valid: false, error: 'Missing CSRF token' };
  }
  
  if (!verifyCSRFToken(token, sessionId)) {
    return { valid: false, error: 'Invalid CSRF token' };
  }
  
  return { valid: true };
}
