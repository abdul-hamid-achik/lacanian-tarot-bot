import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
    getSpreadById,
    updateSpread,
    deleteSpread,
    validateSpreadPositions,
} from '@/lib/spreads';
import { StatusCodes } from 'http-status-codes';
import { createTarotError } from '@/lib/errors';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const spread = await getSpreadById(id);

        if (!spread) {
            return NextResponse.json(
                createTarotError(StatusCodes.NOT_FOUND, "The spread pattern you seek has vanished into the ethereal mists"),
                { status: StatusCodes.NOT_FOUND }
            );
        }

        // If spread is private, check authorization
        if (!spread.isPublic) {
            try {
                const session = await auth();
                if (!session?.user?.id || session.user.id !== spread.userId) {
                    return NextResponse.json(
                        createTarotError(StatusCodes.FORBIDDEN, "This sacred pattern is veiled from your sight"),
                        { status: StatusCodes.FORBIDDEN }
                    );
                }
            } catch (error) {
                console.error('Authentication error:', error);
                return NextResponse.json(
                    createTarotError(StatusCodes.UNAUTHORIZED, "Your spiritual connection has been disrupted"),
                    { status: StatusCodes.UNAUTHORIZED }
                );
            }
        }

        return NextResponse.json(spread);
    } catch (error) {
        console.error('Failed to fetch spread:', error);
        return NextResponse.json(
            createTarotError(StatusCodes.INTERNAL_SERVER_ERROR, "The cosmic forces could not reveal this spread"),
            { status: StatusCodes.INTERNAL_SERVER_ERROR }
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                createTarotError(StatusCodes.UNAUTHORIZED, "Only initiated seekers may modify spread patterns"),
                { status: StatusCodes.UNAUTHORIZED }
            );
        }

        const { id } = await params;
        // Get existing spread
        const existingSpread = await getSpreadById(id);

        if (!existingSpread) {
            return NextResponse.json(
                createTarotError(StatusCodes.NOT_FOUND, "The spread pattern you seek to modify has vanished"),
                { status: StatusCodes.NOT_FOUND }
            );
        }

        // Check ownership
        if (existingSpread.userId !== session.user.id) {
            return NextResponse.json(
                createTarotError(StatusCodes.FORBIDDEN, "You are not attuned to modify this sacred pattern"),
                { status: StatusCodes.FORBIDDEN }
            );
        }

        const body = await request.json();

        // Validate positions if they're being updated
        if (body.positions && !validateSpreadPositions(body.positions)) {
            return NextResponse.json(
                createTarotError(StatusCodes.BAD_REQUEST, "The positions in your spread do not align with the cosmic order"),
                { status: StatusCodes.BAD_REQUEST }
            );
        }

        // Update spread
        const updatedSpread = await updateSpread(id, body);

        if (!updatedSpread) {
            return NextResponse.json(
                createTarotError(StatusCodes.INTERNAL_SERVER_ERROR, "The cosmic forces resist this transformation"),
                { status: StatusCodes.INTERNAL_SERVER_ERROR }
            );
        }

        return NextResponse.json({
            message: "The sacred pattern has been realigned",
            spread: updatedSpread
        });
    } catch (error) {
        // Check if it's an auth error
        if (error instanceof Error && error.message.includes('auth')) {
            console.error('Authentication error:', error);
            return NextResponse.json(
                createTarotError(StatusCodes.UNAUTHORIZED, "Your spiritual connection has been disrupted"),
                { status: StatusCodes.UNAUTHORIZED }
            );
        }

        console.error('Failed to update spread:', error);
        return NextResponse.json(
            createTarotError(StatusCodes.INTERNAL_SERVER_ERROR, "The mystical energies could not complete this transformation"),
            { status: StatusCodes.INTERNAL_SERVER_ERROR }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                createTarotError(StatusCodes.UNAUTHORIZED, "Only initiated seekers may dissolve spread patterns"),
                { status: StatusCodes.UNAUTHORIZED }
            );
        }

        const { id } = await params;
        // Get existing spread
        const existingSpread = await getSpreadById(id);

        if (!existingSpread) {
            return NextResponse.json(
                createTarotError(StatusCodes.NOT_FOUND, "The spread pattern you seek to dissolve has already faded"),
                { status: StatusCodes.NOT_FOUND }
            );
        }

        // Check ownership
        if (existingSpread.userId !== session.user.id) {
            return NextResponse.json(
                createTarotError(StatusCodes.FORBIDDEN, "You are not attuned to dissolve this sacred pattern"),
                { status: StatusCodes.FORBIDDEN }
            );
        }

        // Delete spread
        const success = await deleteSpread(id);

        if (!success) {
            return NextResponse.json(
                createTarotError(StatusCodes.INTERNAL_SERVER_ERROR, "The cosmic forces prevent this pattern's dissolution"),
                { status: StatusCodes.INTERNAL_SERVER_ERROR }
            );
        }

        return NextResponse.json({ message: "The sacred pattern has returned to the cosmic void" });
    } catch (error) {
        // Check if it's an auth error
        if (error instanceof Error && error.message.includes('auth')) {
            console.error('Authentication error:', error);
            return NextResponse.json(
                createTarotError(StatusCodes.UNAUTHORIZED, "Your spiritual connection has been disrupted"),
                { status: StatusCodes.UNAUTHORIZED }
            );
        }

        console.error('Failed to delete spread:', error);
        return NextResponse.json(
            createTarotError(StatusCodes.INTERNAL_SERVER_ERROR, "The mystical energies could not complete this dissolution"),
            { status: StatusCodes.INTERNAL_SERVER_ERROR }
        );
    }
}
