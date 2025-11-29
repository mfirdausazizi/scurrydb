import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable gzip/brotli compression for API responses
  compress: true,
  
  // Externalize native modules that don't work with Turbopack
  serverExternalPackages: ['ssh2'],
  
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob:",
            "font-src 'self' data:",
            "connect-src 'self' https://challenges.cloudflare.com",
            "frame-src 'self' https://challenges.cloudflare.com",
          ].join('; '),
        },
      ],
    },
    // Cache headers for schema endpoints (5 minutes, private cache)
    {
      source: '/api/schema/:path*',
      headers: [
        { key: 'Cache-Control', value: 'private, max-age=300, stale-while-revalidate=60' },
      ],
    },
    // Cache headers for static connection info
    {
      source: '/api/connections',
      headers: [
        { key: 'Cache-Control', value: 'private, max-age=60, stale-while-revalidate=30' },
      ],
    },
  ],
};

export default nextConfig;
