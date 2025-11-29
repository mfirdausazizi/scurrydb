import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  checkRateLimit,
  createRateLimitHeaders,
  getClientIp,
  createRateLimitKey,
  type RateLimitType,
} from '@/lib/security/rate-limiter';

/**
 * Route configuration for rate limiting
 * Maps URL patterns to rate limit types
 */
const RATE_LIMITED_ROUTES: Array<{
  pattern: RegExp;
  type: RateLimitType;
  keyType: 'ip' | 'session' | 'both';
  methods?: string[];
}> = [
  // Authentication endpoints - limit by IP
  {
    pattern: /^\/api\/auth\/login$/,
    type: 'login',
    keyType: 'ip',
    methods: ['POST'],
  },
  {
    pattern: /^\/api\/auth\/register$/,
    type: 'register',
    keyType: 'ip',
    methods: ['POST'],
  },
  {
    pattern: /^\/api\/auth\/forgot-password$/,
    type: 'forgotPassword',
    keyType: 'ip',
    methods: ['POST'],
  },
  {
    pattern: /^\/api\/auth\/reset-password$/,
    type: 'resetPassword',
    keyType: 'ip',
    methods: ['POST'],
  },
  
  // Query execution - limit by session (user)
  {
    pattern: /^\/api\/query\/execute$/,
    type: 'queryExecution',
    keyType: 'session',
    methods: ['POST'],
  },
  
  // Schema endpoints - limit by session
  {
    pattern: /^\/api\/schema\/.*/,
    type: 'schemaFetch',
    keyType: 'session',
  },
  
  // AI chat - limit by session
  {
    pattern: /^\/api\/ai\/.*/,
    type: 'aiChat',
    keyType: 'session',
    methods: ['POST'],
  },
];

/**
 * Gets the session ID from cookies for rate limiting
 */
function getSessionId(request: NextRequest): string | null {
  const sessionCookie = request.cookies.get('scurrydb_session');
  return sessionCookie?.value || null;
}

/**
 * Determines rate limit key based on configuration
 */
function getRateLimitKey(
  request: NextRequest,
  keyType: 'ip' | 'session' | 'both'
): string {
  const ip = getClientIp(request);
  const sessionId = getSessionId(request);
  
  switch (keyType) {
    case 'ip':
      return createRateLimitKey('ip', ip);
    case 'session':
      // Fall back to IP if no session
      return sessionId
        ? createRateLimitKey('session', sessionId)
        : createRateLimitKey('ip', ip);
    case 'both':
      return createRateLimitKey('ip', ip, 'session', sessionId);
    default:
      return createRateLimitKey('ip', ip);
  }
}

/**
 * Proxy function to handle rate limiting
 * Note: Renamed from middleware() to proxy() for Next.js 16 compatibility
 */
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const method = request.method;
  
  // Find matching rate limit configuration
  for (const route of RATE_LIMITED_ROUTES) {
    if (!route.pattern.test(pathname)) {
      continue;
    }
    
    // Check if method matches (if specified)
    if (route.methods && !route.methods.includes(method)) {
      continue;
    }
    
    // Generate rate limit key
    const key = getRateLimitKey(request, route.keyType);
    const rateLimitKey = createRateLimitKey(route.type, key);
    
    // Check rate limit
    const result = checkRateLimit(rateLimitKey, route.type);
    
    // If rate limited, return 429 response
    if (!result.allowed) {
      const headers = createRateLimitHeaders(result);
      
      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
        }
      );
    }
    
    // Add rate limit headers to successful response
    const response = NextResponse.next();
    const headers = createRateLimitHeaders(result);
    
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  }
  
  // No rate limiting for this route
  return NextResponse.next();
}

/**
 * Configure which routes the middleware runs on
 */
export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
  ],
};
