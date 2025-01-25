import type { NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db/client';

const devProvider = process.env.NODE_ENV === 'development'
  ? [
    Credentials({
      credentials: {},
      async authorize() {
        return {
          id: "dev-user-000000",
          name: "Development User",
          email: "dev@local.host",
          image: "https://avatar.vercel.sh/dev@local.host"
        };
      },
    }),
  ]
  : [];

export const authConfig: NextAuthConfig = {
  adapter: DrizzleAdapter(db),
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/login'
  },
  providers: [
    ...devProvider,
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    })
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/chat');
      const isOnApi = nextUrl.pathname.startsWith('/api');

      if (isOnDashboard || isOnApi) {
        if (isLoggedIn) return true;
        return false;
      } else if (isLoggedIn) {
        return Response.redirect(nextUrl.origin + '/chat');
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
