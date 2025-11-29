import { NextResponse } from 'next/server';

// Cache the IP for 5 minutes to avoid excessive API calls
let cachedIP: string | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getPublicIP(): Promise<string | null> {
  const now = Date.now();
  
  // Return cached IP if still valid
  if (cachedIP && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedIP;
  }

  try {
    // Try multiple IP lookup services for reliability
    const services = [
      'https://api.ipify.org?format=json',
      'https://ipinfo.io/json',
      'https://api.ip.sb/ip',
    ];

    for (const service of services) {
      try {
        const response = await fetch(service, { 
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          
          if (contentType?.includes('application/json')) {
            const data = await response.json();
            cachedIP = data.ip;
          } else {
            // Plain text response (like api.ip.sb)
            cachedIP = (await response.text()).trim();
          }
          
          cacheTimestamp = now;
          return cachedIP;
        }
      } catch {
        // Try next service
        continue;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

export async function GET() {
  const ip = await getPublicIP();
  
  return NextResponse.json({
    ip: ip || 'Unable to determine',
    cached: cachedIP !== null && (Date.now() - cacheTimestamp) < CACHE_DURATION,
  });
}
