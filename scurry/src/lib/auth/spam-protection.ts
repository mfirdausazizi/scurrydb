/**
 * Spam protection utilities for authentication endpoints
 * Combines honeypot fields with Cloudflare Turnstile verification
 */

export interface SpamCheckResult {
  passed: boolean;
  error?: string;
}

/**
 * Verify honeypot fields - bots will fill these hidden fields
 * @param honeypotValue - The value of the honeypot field (should be empty for humans)
 */
export function verifyHoneypot(honeypotValue: string | undefined | null): SpamCheckResult {
  // If honeypot field has a value, it's likely a bot
  if (honeypotValue && honeypotValue.trim() !== '') {
    console.warn('Honeypot triggered - likely bot submission');
    return {
      passed: false,
      error: 'Spam detected',
    };
  }
  return { passed: true };
}

/**
 * Verify Cloudflare Turnstile token
 * @param token - The Turnstile token from the client
 * @param ip - Optional IP address for additional validation
 */
export async function verifyTurnstile(
  token: string | undefined | null,
  ip?: string
): Promise<SpamCheckResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // If Turnstile is not configured, skip verification
  if (!secretKey) {
    return { passed: true };
  }

  // If no token provided but Turnstile is configured, fail
  if (!token) {
    return {
      passed: false,
      error: 'Please complete the verification',
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (ip) {
      formData.append('remoteip', ip);
    }

    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      }
    );

    const result = await response.json();

    if (result.success) {
      return { passed: true };
    }

    console.warn('Turnstile verification failed:', result['error-codes']);
    return {
      passed: false,
      error: 'Verification failed. Please try again.',
    };
  } catch (error) {
    console.error('Turnstile verification error:', error);
    // On error, allow through to avoid blocking legitimate users
    return { passed: true };
  }
}

/**
 * Perform full spam check (honeypot + Turnstile)
 */
export async function performSpamCheck(
  honeypotValue: string | undefined | null,
  turnstileToken: string | undefined | null,
  ip?: string
): Promise<SpamCheckResult> {
  // Check honeypot first (fast, no network request)
  const honeypotResult = verifyHoneypot(honeypotValue);
  if (!honeypotResult.passed) {
    return honeypotResult;
  }

  // Then verify Turnstile
  const turnstileResult = await verifyTurnstile(turnstileToken, ip);
  if (!turnstileResult.passed) {
    return turnstileResult;
  }

  return { passed: true };
}

/**
 * Check if spam protection is enabled
 */
export function isSpamProtectionEnabled(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY;
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string | undefined {
  // Cloudflare
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp;

  // Standard forwarded header
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  // Vercel
  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) return xRealIp;

  return undefined;
}
