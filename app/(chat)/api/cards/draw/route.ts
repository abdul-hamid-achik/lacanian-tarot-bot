import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { PersonaManager } from '@/lib/theme-manager';
import { drawPersonalizedCards } from '@/lib/card-selector';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { numCards = 1 } = await request.json();

        if (typeof numCards !== 'number' || numCards < 1 || numCards > 10) {
            return NextResponse.json(
                { error: 'Invalid number of cards requested' },
                { status: 400 }
            );
        }

        // Get user's persona
        const personaManager = new PersonaManager();
        const userPersona = await personaManager.getPersona(session.user.id || '');

        // Draw cards based on persona
        const cards = await drawPersonalizedCards(numCards, userPersona);

        return NextResponse.json(cards);
    } catch (error) {
        console.error('Failed to draw cards:', error);
        return NextResponse.json(
            { error: 'Failed to draw cards' },
            { status: 500 }
        );
    }
}
