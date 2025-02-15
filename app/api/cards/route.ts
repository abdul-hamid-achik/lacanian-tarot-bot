import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { tarotCard } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { StatusCodes } from 'http-status-codes';
import { createTarotError } from '@/lib/errors';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (id) {
            const [card] = await db
                .select()
                .from(tarotCard)
                .where(eq(tarotCard.id, id));

            if (!card) {
                return NextResponse.json(
                    createTarotError(StatusCodes.NOT_FOUND, "The card you seek remains hidden in the shadows"),
                    { status: StatusCodes.NOT_FOUND }
                );
            }

            return NextResponse.json(card);
        }

        // Get all cards if no specific query
        const cards = await db.select().from(tarotCard);
        return NextResponse.json(cards);
    } catch (error) {
        console.error('Failed to fetch cards:', error);
        return NextResponse.json(
            createTarotError(StatusCodes.INTERNAL_SERVER_ERROR, "The cards refuse to reveal themselves"),
            { status: StatusCodes.INTERNAL_SERVER_ERROR }
        );
    }
} 