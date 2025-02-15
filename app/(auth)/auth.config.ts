import type { NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db/client';

export const authConfig: NextAuthConfig = {
  adapter: DrizzleAdapter(db),
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/login'
  },
  providers: [
    ...(process.env.NODE_ENV === 'production'
      ? [
        GitHub({
          clientId: process.env.GITHUB_ID!,
          clientSecret: process.env.GITHUB_SECRET!
        }),
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!
        })
      ]
      : []),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/chat');
      const isOnApi = nextUrl.pathname.startsWith('/api');
      const isOnChatApi = nextUrl.pathname.startsWith('/api/chat');
      const isOnVoteApi = nextUrl.pathname.startsWith('/api/vote');

      // Allow anonymous access to chat and vote APIs
      if (isOnChatApi || isOnVoteApi) {
        return true;
      }

      // Protected routes that require authentication
      const protectedRoutes = [
        '/profile',
        '/settings',
        '/dashboard'
      ];

      const isProtectedRoute = protectedRoutes.some(route => 
        nextUrl.pathname.startsWith(route)
      );

      if (isProtectedRoute) {
        if (isLoggedIn) return true;
        return false;
      }

      // Public routes
      if (isOnDashboard || isOnApi) {
        return true;
      }

      return true;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
      }
      return session;
    }
  }
};
