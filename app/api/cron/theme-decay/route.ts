import { PersonaManager } from '@/lib/theme-manager';
import { db } from '@/lib/db/client';
import { user } from '@/lib/db/schema';
import { NextResponse } from 'next/server';
import { StatusCodes } from 'http-status-codes';
import { createTarotError } from '@/lib/errors';

// This endpoint should be protected with a cron job secret
const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: Request) {
    try {
        // Verify the request is from our cron job
        const authHeader = request.headers.get('authorization');
        if (!CRON_SECRET || !authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
            return NextResponse.json(
                createTarotError(StatusCodes.UNAUTHORIZED, "The cosmic timekeeper denies your request"),
                { status: StatusCodes.UNAUTHORIZED }
            );
        }

        const personaManager = new PersonaManager();
        const users = await db.select().from(user);
        let processed = 0;
        let errors = 0;

        // Process each user's themes
        for (const user of users) {
            try {
                await personaManager.applyDecay(user.id);
                processed++;
            } catch (error) {
                console.error(`Failed to process user ${user.id}:`, error);
                errors++;
            }
        }

        return NextResponse.json({
            success: true,
            message: "The cosmic energies have been rebalanced",
            processed,
            errors,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Theme decay job failed:', error);
        return NextResponse.json(
            createTarotError(StatusCodes.INTERNAL_SERVER_ERROR, "The celestial balance could not be maintained"),
            { status: StatusCodes.INTERNAL_SERVER_ERROR }
        );
    }
}

// Only allow POST requests
export async function GET() {
    return NextResponse.json(
        createTarotError(StatusCodes.METHOD_NOT_ALLOWED, "The cosmic timekeeper only accepts offerings through sacred rituals"),
        { status: StatusCodes.METHOD_NOT_ALLOWED }
    );
}
