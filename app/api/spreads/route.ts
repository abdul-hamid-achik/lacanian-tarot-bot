import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { spread as spreadTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { StatusCodes } from 'http-status-codes';
import { createTarotError } from '@/lib/errors';

export async function GET(request: Request) {
    try {
        const session = await auth();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const userId = searchParams.get('userId');

        if (id) {
            const [spread] = await db
                .select()
                .from(spreadTable)
                .where(eq(spreadTable.id, id));

            if (!spread) {
                return NextResponse.json(
                    createTarotError(StatusCodes.NOT_FOUND, "The spread you seek remains veiled in mystery"),
                    { status: StatusCodes.NOT_FOUND }
                );
            }

            return NextResponse.json(spread);
        }

        if (userId) {
            const spreads = await db
                .select()
                .from(spreadTable)
                .where(eq(spreadTable.userId, userId));

            return NextResponse.json(spreads);
        }

        // Get public spreads if no specific query
        const spreads = await db
            .select()
            .from(spreadTable)
            .where(eq(spreadTable.isPublic, true));

        return NextResponse.json(spreads);
    } catch (error) {
        console.error('Failed to fetch spreads:', error);
        return NextResponse.json(
            createTarotError(StatusCodes.INTERNAL_SERVER_ERROR, "The cosmic energies are disturbed"),
            { status: StatusCodes.INTERNAL_SERVER_ERROR }
        );
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json(
                createTarotError(StatusCodes.UNAUTHORIZED, "You must be attuned to create new spreads"),
                { status: StatusCodes.UNAUTHORIZED }
            );
        }

        const body = await request.json();
        const spread = await db.insert(spreadTable).values({
            ...body,
            userId: session.user.id,
            createdAt: new Date(),
            updatedAt: new Date(),
        }).returning();

        return NextResponse.json(spread[0]);
    } catch (error) {
        console.error('Failed to create spread:', error);
        return NextResponse.json(
            createTarotError(StatusCodes.INTERNAL_SERVER_ERROR, "The cosmic energies resist this new pattern"),
            { status: StatusCodes.INTERNAL_SERVER_ERROR }
        );
    }
} 