import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

import { authConfig } from '@/app/(auth)/auth.config';

export default NextAuth(authConfig).auth;

// Create a new ratelimiter that allows 10 requests per 15 seconds
const ratelimit = process.env.NODE_ENV === 'production' 
  ? new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(10, '15s'),
      analytics: true,
    })
  : null;

export async function middleware(request: NextRequest) {
  // Only rate limit API routes in production
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

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/:id', '/api/:path*', '/login', '/register'],
};
