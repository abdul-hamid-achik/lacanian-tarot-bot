'use client';

import { signIn, signOut } from 'next-auth/react';
import type { User } from 'next-auth';
import { Button } from '@/components/ui/button';

export function AuthButtons({ user }: { user: User | undefined }) {
    if (user) {
        return (
            <Button
                variant="ghost"
                onClick={() => signOut()}
                className="w-full justify-start"
            >
                Sign out
            </Button>
        );
    }

    return (
        <div className="flex flex-col gap-2 px-2">
            <Button
                variant="outline"
                onClick={() => signIn()}
                className="w-full justify-start"
            >
                Sign in
            </Button>
            <Button
                variant="default"
                onClick={() => signIn()}
                className="w-full justify-start"
            >
                Sign up
            </Button>
        </div>
    );
}
