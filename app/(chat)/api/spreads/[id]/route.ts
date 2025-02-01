import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
    getSpreadById,
    updateSpread,
    deleteSpread,
    validateSpreadPositions,
} from '@/lib/spreads';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const spread = await getSpreadById(id);

        if (!spread) {
            return NextResponse.json(
                { error: 'Spread not found' },
                { status: 404 }
            );
        }

        // If spread is private, check authorization
        if (!spread.isPublic) {
            const session = await auth();
            if (!session?.user || session.user.id !== spread.userId) {
                return NextResponse.json(
                    { error: 'Unauthorized' },
                    { status: 401 }
                );
            }
        }

        return NextResponse.json(spread);
    } catch (error) {
        console.error('Failed to fetch spread:', error);
        return NextResponse.json(
            { error: 'Failed to fetch spread' },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    try {
        const { id } = await params;
        // Get existing spread
        const existingSpread = await getSpreadById(id);

        if (!existingSpread) {
            return NextResponse.json(
                { error: 'Spread not found' },
                { status: 404 }
            );
        }

        // Check ownership
        if (existingSpread.userId !== session.user.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();

        // Validate positions if they're being updated
        if (body.positions && !validateSpreadPositions(body.positions)) {
            return NextResponse.json(
                { error: 'Invalid positions format' },
                { status: 400 }
            );
        }

        // Update spread
        const updatedSpread = await updateSpread(id, body);

        if (!updatedSpread) {
            return NextResponse.json(
                { error: 'Failed to update spread' },
                { status: 500 }
            );
        }

        return NextResponse.json(updatedSpread);
    } catch (error) {
        console.error('Failed to update spread:', error);
        return NextResponse.json(
            { error: 'Failed to update spread' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    try {
        const { id } = await params;
        // Get existing spread
        const existingSpread = await getSpreadById(id);

        if (!existingSpread) {
            return NextResponse.json(
                { error: 'Spread not found' },
                { status: 404 }
            );
        }

        // Check ownership
        if (existingSpread.userId !== session.user.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Delete spread
        const success = await deleteSpread(id);

        if (!success) {
            return NextResponse.json(
                { error: 'Failed to delete spread' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete spread:', error);
        return NextResponse.json(
            { error: 'Failed to delete spread' },
            { status: 500 }
        );
    }
}
