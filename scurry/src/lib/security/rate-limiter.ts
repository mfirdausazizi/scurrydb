/**
 * In-memory rate limiter using LRU cache
 * For production with multiple instances, consider using Redis
 */

import { LRUCache } from 'lru-cache';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

interface RateLimitEntry {
  attempts: number[];
}

// Default rate limit configurations
export const RATE_LIMITS = {
  // Authentication endpoints - strict limits
  login: { limit: 5, windowMs: 60 * 1000 },          // 5 attempts per minute
  register: { limit: 3, windowMs: 60 * 1000 },       // 3 attempts per minute
  forgotPassword: { limit: 3, windowMs: 60 * 1000 }, // 3 attempts per minute
  resetPassword: { limit: 5, windowMs: 60 * 1000 },  // 5 attempts per minute
  
  // API endpoints - normal limits
  queryExecution: { limit: 100, windowMs: 60 * 1000 },  // 100 queries per minute
  schemaFetch: { limit: 200, windowMs: 60 * 1000 },     // 200 schema requests per minute
  generalApi: { limit: 1000, windowMs: 60 * 1000 },     // 1000 requests per minute
  
  // AI chat - moderate limits
  aiChat: { limit: 30, windowMs: 60 * 1000 },           // 30 AI requests per minute
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

// LRU cache to store rate limit entries
// Max 50,000 entries, items expire after 5 minutes
const cache = new LRUCache<string, RateLimitEntry>({
  max: 50000,
  ttl: 5 * 60 * 1000, // 5 minutes
});

/**
 * Checks if a request should be rate limited
 * @param key - Unique identifier for the rate limit (e.g., IP address, user ID)
 * @param type - Type of rate limit to apply
 * @returns Rate limit result with allowed status and metadata
 */
export function checkRateLimit(key: string, type: RateLimitType): RateLimitResult {
  const config = RATE_LIMITS[type];
  return checkRateLimitCustom(key, config.limit, config.windowMs);
}

/**
 * Checks if a request should be rate limited with custom limits
 * @param key - Unique identifier for the rate limit
 * @param limit - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns Rate limit result with allowed status and metadata
 */
export function checkRateLimitCustom(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Get existing entry or create new one
  let entry = cache.get(key);
  
  if (!entry) {
    entry = { attempts: [] };
  }
  
  // Filter out attempts outside the current window
  entry.attempts = entry.attempts.filter(t => t > windowStart);
  
  // Check if limit is exceeded
  if (entry.attempts.length >= limit) {
    // Find when the oldest attempt in window will expire
    const oldestAttempt = Math.min(...entry.attempts);
    const resetAt = oldestAttempt + windowMs;
    
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      limit,
    };
  }
  
  // Add new attempt
  entry.attempts.push(now);
  cache.set(key, entry);
  
  return {
    allowed: true,
    remaining: limit - entry.attempts.length,
    resetAt: now + windowMs,
    limit,
  };
}

/**
 * Creates rate limit headers for HTTP responses
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)), // Unix timestamp in seconds
  };
  
  if (!result.allowed) {
    const retryAfterSeconds = Math.ceil((result.resetAt - Date.now()) / 1000);
    headers['Retry-After'] = String(Math.max(1, retryAfterSeconds));
  }
  
  return headers;
}

/**
 * Resets rate limit for a specific key
 * Useful for testing or admin operations
 */
export function resetRateLimit(key: string): void {
  cache.delete(key);
}

/**
 * Resets all rate limits
 * USE WITH CAUTION - mainly for testing
 */
export function resetAllRateLimits(): void {
  cache.clear();
}

/**
 * Gets the current rate limit status for a key without incrementing
 */
export function getRateLimitStatus(key: string, type: RateLimitType): RateLimitResult {
  const config = RATE_LIMITS[type];
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  const entry = cache.get(key);
  
  if (!entry) {
    return {
      allowed: true,
      remaining: config.limit,
      resetAt: now + config.windowMs,
      limit: config.limit,
    };
  }
  
  const validAttempts = entry.attempts.filter(t => t > windowStart);
  const remaining = Math.max(0, config.limit - validAttempts.length);
  
  if (validAttempts.length > 0) {
    const oldestAttempt = Math.min(...validAttempts);
    return {
      allowed: remaining > 0,
      remaining,
      resetAt: oldestAttempt + config.windowMs,
      limit: config.limit,
    };
  }
  
  return {
    allowed: true,
    remaining: config.limit,
    resetAt: now + config.windowMs,
    limit: config.limit,
  };
}

/**
 * Creates a composite key for rate limiting
 * Combines multiple identifiers (e.g., IP + user ID)
 */
export function createRateLimitKey(...parts: (string | undefined | null)[]): string {
  return parts.filter(Boolean).join(':');
}

/**
 * Extracts client IP from request headers
 * Handles various proxy configurations
 */
export function getClientIp(request: Request): string {
  // Check for forwarded IP (when behind proxy)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP in the chain (original client)
    return forwardedFor.split(',')[0].trim();
  }
  
  // Check for real IP header (Nginx)
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // Check for Cloudflare IP
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp;
  }
  
  // Fallback to unknown
  return 'unknown';
}
