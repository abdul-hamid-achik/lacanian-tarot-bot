import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { PersonaManager } from '@/lib/theme-manager';
import { drawPersonalizedCards } from '@/lib/card-selector';
import { StatusCodes } from 'http-status-codes';
import { createTarotError } from '@/lib/errors';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user) {
            return NextResponse.json(
                createTarotError(StatusCodes.UNAUTHORIZED),
                { status: StatusCodes.UNAUTHORIZED }
            );
        }

        const { numCards = 1 } = await request.json();

        if (typeof numCards !== 'number' || numCards < 1 || numCards > 10) {
            return NextResponse.json(
                createTarotError(StatusCodes.BAD_REQUEST, "The cards whisper that your request exceeds the bounds of their wisdom"),
                { status: StatusCodes.BAD_REQUEST }
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
            createTarotError(StatusCodes.INTERNAL_SERVER_ERROR, "The cosmic energies are misaligned for this reading"),
            { status: StatusCodes.INTERNAL_SERVER_ERROR }
        );
    }
}
