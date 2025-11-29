/**
 * API Client with CSRF Protection
 * 
 * Provides a fetch wrapper that automatically handles CSRF tokens
 * and common API request patterns.
 */

/**
 * Gets the CSRF token from the meta tag in the document
 */
function getCSRFToken(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  
  const metaTag = document.querySelector('meta[name="csrf-token"]');
  return metaTag?.getAttribute('content') || null;
}

/**
 * HTTP methods that require CSRF token
 */
const CSRF_REQUIRED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

export interface ApiFetchOptions extends RequestInit {
  /**
   * Skip CSRF token attachment
   */
  skipCSRF?: boolean;
  
  /**
   * Automatically parse JSON response
   */
  parseJSON?: boolean;
  
  /**
   * Custom base URL (defaults to current origin)
   */
  baseUrl?: string;
}

export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
  status: number;
  headers: Headers;
}

/**
 * Enhanced fetch wrapper with CSRF protection and error handling
 */
export async function apiFetch<T = unknown>(
  url: string,
  options: ApiFetchOptions = {}
): Promise<ApiResponse<T>> {
  const {
    skipCSRF = false,
    parseJSON = true,
    baseUrl,
    headers: customHeaders,
    ...fetchOptions
  } = options;
  
  // Build full URL if baseUrl provided
  const fullUrl = baseUrl ? new URL(url, baseUrl).toString() : url;
  
  // Build headers
  const headers = new Headers(customHeaders);
  
  // Add CSRF token for state-changing requests
  const method = (fetchOptions.method || 'GET').toUpperCase();
  if (!skipCSRF && CSRF_REQUIRED_METHODS.includes(method)) {
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }
  }
  
  // Set default content type for JSON bodies
  if (fetchOptions.body && typeof fetchOptions.body === 'string') {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }
  
  try {
    const response = await fetch(fullUrl, {
      ...fetchOptions,
      headers,
      credentials: 'same-origin', // Include cookies for same-origin requests
    });
    
    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const errorData = parseJSON ? await response.json().catch(() => ({})) : {};
      
      return {
        data: null,
        error: errorData.error || `Rate limited. Retry after ${retryAfter || 'some time'} seconds.`,
        status: response.status,
        headers: response.headers,
      };
    }
    
    // Handle CSRF errors
    if (response.status === 403) {
      const errorData = parseJSON ? await response.json().catch(() => ({})) : {};
      if (errorData.error?.includes('CSRF')) {
        // CSRF token might be expired, refresh and retry could be implemented here
        return {
          data: null,
          error: 'Session expired. Please refresh the page.',
          status: response.status,
          headers: response.headers,
        };
      }
    }
    
    // Parse response
    let data: T | null = null;
    if (parseJSON) {
      try {
        data = await response.json();
      } catch {
        // Response might not be JSON
        data = null;
      }
    }
    
    // Handle error responses
    if (!response.ok) {
      const errorMessage = (data as { error?: string })?.error 
        || `Request failed with status ${response.status}`;
      
      return {
        data: null,
        error: errorMessage,
        status: response.status,
        headers: response.headers,
      };
    }
    
    return {
      data,
      error: null,
      status: response.status,
      headers: response.headers,
    };
  } catch (error) {
    // Network or other errors
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Network error',
      status: 0,
      headers: new Headers(),
    };
  }
}

/**
 * Convenience methods for common HTTP methods
 */
export const api = {
  get: <T = unknown>(url: string, options?: ApiFetchOptions) =>
    apiFetch<T>(url, { ...options, method: 'GET' }),
  
  post: <T = unknown>(url: string, body?: unknown, options?: ApiFetchOptions) =>
    apiFetch<T>(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  
  put: <T = unknown>(url: string, body?: unknown, options?: ApiFetchOptions) =>
    apiFetch<T>(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  
  patch: <T = unknown>(url: string, body?: unknown, options?: ApiFetchOptions) =>
    apiFetch<T>(url, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
  
  delete: <T = unknown>(url: string, options?: ApiFetchOptions) =>
    apiFetch<T>(url, { ...options, method: 'DELETE' }),
};

export default api;
