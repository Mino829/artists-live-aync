import { NextResponse } from 'next/server';

/**
 * Verifies if the request contains the correct API key/password in headers, cookies, or query params.
 */
export function verifyAuth(request: Request): boolean {
  const securePassword = process.env.ACCESS_PASSWORD;
  
  // If ACCESS_PASSWORD is not set, default to allowing access
  if (!securePassword) {
    return true; 
  }

  // 1. Check custom header (x-api-key)
  const apiKey = request.headers.get('x-api-key');
  if (apiKey === securePassword) {
    return true;
  }

  // 2. Check Authorization header (Bearer token style)
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (token === securePassword) {
      return true;
    }
  }

  // 3. Check query parameter (useful for cron jobs, e.g. /api/scrape?key=...)
  try {
    const { searchParams } = new URL(request.url);
    const queryKey = searchParams.get('key');
    if (queryKey === securePassword) {
      return true;
    }
  } catch (e) {
    // Ignore URL parsing errors
  }

  return false;
}

/**
 * Helper to return a 401 Unauthorized response
 */
export function unauthorizedResponse() {
  return NextResponse.json(
    { error: 'Unauthorized: Access password is invalid or missing.' },
    { status: 401 }
  );
}
