import { PersonaManager } from '@/lib/theme-manager';
import { db } from '@/lib/db/client';
import { user } from '@/lib/db/schema';
import { NextResponse } from 'next/server';

// This endpoint should be protected with a cron job secret
const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: Request) {
    try {
        // Verify the request is from our cron job
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${CRON_SECRET}`) {
            return new NextResponse('Unauthorized', { status: 401 });
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
            processed,
            errors,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Theme decay job failed:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Only allow POST requests
export async function GET() {
    return new NextResponse('Method not allowed', { status: 405 });
}
