import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
    getPublicSpreads,
    getUserSpreads,
    createSpread,
    type CreateSpreadInput,
    validateSpreadPositions,
    type Spread,
} from '@/lib/spreads';
import { StatusCodes } from 'http-status-codes';
import { createTarotError } from '@/lib/errors';

export async function GET() {
    try {
        // Always get public spreads first
        const publicSpreads = await getPublicSpreads();

        // Try to get user session, but don't fail if not present
        const session = await auth().catch(() => null);

        // If user is authenticated, also get their private spreads
        let userSpreads: Spread[] = [];
        if (session?.user?.id) {
            try {
                userSpreads = await getUserSpreads(session.user.id);
            } catch (error) {
                console.error('Failed to fetch user spreads:', error);
                // Don't fail the whole request if user spreads fail
                // Just return public spreads
            }
        }

        return NextResponse.json({
            spreads: [...publicSpreads, ...userSpreads],
        });
    } catch (error) {
        console.error('Failed to fetch spreads:', error);
        return NextResponse.json(
            createTarotError(StatusCodes.INTERNAL_SERVER_ERROR, "The mystical patterns of the spreads elude our vision"),
            { status: StatusCodes.INTERNAL_SERVER_ERROR }
        );
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                createTarotError(StatusCodes.UNAUTHORIZED, "Only initiated seekers may create new spread patterns"),
                { status: StatusCodes.UNAUTHORIZED }
            );
        }

        const body = await request.json();
        const input = body as CreateSpreadInput;

        // Validate input
        if (!input.name || !input.description || !input.positions) {
            return NextResponse.json(
                createTarotError(StatusCodes.BAD_REQUEST, "The sacred pattern requires a name, description, and positions to manifest"),
                { status: StatusCodes.BAD_REQUEST }
            );
        }

        if (!validateSpreadPositions(input.positions)) {
            return NextResponse.json(
                createTarotError(StatusCodes.BAD_REQUEST, "The positions in your spread do not align with the cosmic order"),
                { status: StatusCodes.BAD_REQUEST }
            );
        }

        // Create spread
        const spread = await createSpread({
            ...input,
            userId: session.user.id,
            isPublic: input.isPublic ?? false,
        });

        return NextResponse.json({
            message: "A new pattern has been woven into the tapestry of fate",
            spread
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

        console.error('Failed to create spread:', error);
        return NextResponse.json(
            createTarotError(StatusCodes.INTERNAL_SERVER_ERROR, "The cosmic forces could not manifest your spread pattern"),
            { status: StatusCodes.INTERNAL_SERVER_ERROR }
        );
    }
}
