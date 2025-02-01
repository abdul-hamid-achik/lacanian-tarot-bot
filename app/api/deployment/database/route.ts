import { NextResponse } from 'next/server';
import { deploy } from '@/lib/db/deploy';
import { StatusCodes } from 'http-status-codes';
import { createTarotError } from '@/lib/errors';

// This should match the token you set in Vercel's deployment hook URL
const DEPLOY_TOKEN = process.env.DATABASE_DEPLOY_TOKEN;

export async function POST(request: Request) {
    try {
        // Verify the request is coming from Vercel deployment hook
        const authHeader = request.headers.get('authorization');
        if (!DEPLOY_TOKEN || !authHeader || authHeader !== `Bearer ${DEPLOY_TOKEN}`) {
            return NextResponse.json(
                createTarotError(StatusCodes.UNAUTHORIZED, "The mystical gates remain closed to unauthorized seekers"),
                { status: StatusCodes.UNAUTHORIZED }
            );
        }

        // Run database deployment
        await deploy();

        return NextResponse.json({ message: "The cosmic database has been realigned" });
    } catch (error) {
        console.error('Database deployment failed:', error);
        return NextResponse.json(
            createTarotError(StatusCodes.INTERNAL_SERVER_ERROR, "The mystical realignment of the database has failed"),
            { status: StatusCodes.INTERNAL_SERVER_ERROR }
        );
    }
}
