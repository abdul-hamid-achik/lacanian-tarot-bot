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

export async function GET() {
    const session = await auth();

    try {
        // Get public spreads
        const publicSpreads = await getPublicSpreads();

        // If user is authenticated, also get their private spreads
        let userSpreads: Spread[] = [];
        if (session?.user) {
            userSpreads = await getUserSpreads(session.user.id!);
        }

        return NextResponse.json({
            spreads: [...publicSpreads, ...userSpreads],
        });
    } catch (error) {
        console.error('Failed to fetch spreads:', error);
        return NextResponse.json(
            { error: 'Failed to fetch spreads' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    try {
        const body = await request.json();
        const input = body as CreateSpreadInput;

        // Validate input
        if (!input.name || !input.description || !input.positions) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        if (!validateSpreadPositions(input.positions)) {
            return NextResponse.json(
                { error: 'Invalid positions format' },
                { status: 400 }
            );
        }

        // Create spread
        const spread = await createSpread({
            ...input,
            userId: session.user.id!,
            isPublic: input.isPublic ?? false,
        });

        return NextResponse.json(spread);
    } catch (error) {
        console.error('Failed to create spread:', error);
        return NextResponse.json(
            { error: 'Failed to create spread' },
            { status: 500 }
        );
    }
}
