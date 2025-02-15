import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

import { auth } from '@/app/(auth)/auth';

// Create a new ratelimiter that allows 10 requests per 15 seconds
const ratelimit = process.env.NODE_ENV === 'production' 
  ? new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(10, '15s'),
      analytics: true,
    })
  : null;

// Helper function to generate UUID using Web Crypto API
function generateUUID() {
  const array = new Uint8Array(16);
  globalThis.crypto.getRandomValues(array);
  
  // Set version (4) and variant (2) bits
  array[6] = (array[6] & 0x0f) | 0x40;
  array[8] = (array[8] & 0x3f) | 0x80;
  
  // Convert to hex string with proper UUID format
  const hex = Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function middleware(request: NextRequest) {
  // Skip middleware for static files and auth endpoints
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api/auth') ||
    request.nextUrl.pathname.startsWith('/static') ||
    request.nextUrl.pathname.startsWith('/favicon.ico') ||
    request.nextUrl.pathname.startsWith('/sitemap.xml')
  ) {
    return NextResponse.next();
  }

  // Handle rate limiting for API routes in production
  if (process.env.NODE_ENV === 'production' && request.nextUrl.pathname.startsWith('/api')) {
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor?.split(',')[0] ?? '127.0.0.1';
    const result = await ratelimit?.limit(`ratelimit_${ip}`);

    if (result && !result.success) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.reset.toString(),
        },
      });
    }
  }

  // Get the user session
  const session = await auth();
  
  // If user is authenticated, no need for anonymous session
  if (session?.user) {
    return NextResponse.next();
  }

  // For unauthenticated users, ensure they have an anonymous session
  const anonymousSession = request.cookies.get('anonymous_session');
  const response = NextResponse.next();

  if (!anonymousSession) {
    const newSessionId = generateUUID();
    response.cookies.set('anonymous_session', newSessionId, {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
  }

  return response;
}

// Configure which routes should run the middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /_next (Next.js internals)
     * 2. /api/auth (auth endpoints)
     * 3. /static (static files)
     * 4. /_vercel (Vercel internals)
     * 5. /favicon.ico, /sitemap.xml (static files)
     */
    '/((?!_next|api/auth|static|_vercel|favicon.ico|sitemap.xml).*)',
  ],
};
