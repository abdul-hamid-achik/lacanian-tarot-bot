import { NextResponse } from 'next/server';
import { deploy } from '@/lib/db/deploy';

// This should match the token you set in Vercel's deployment hook URL
const DEPLOY_TOKEN = process.env.DATABASE_DEPLOY_TOKEN;

export async function POST(request: Request) {
    try {
        // Verify the request is coming from Vercel deployment hook
        const authHeader = request.headers.get('authorization');
        if (!DEPLOY_TOKEN || !authHeader || authHeader !== `Bearer ${DEPLOY_TOKEN}`) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Run database deployment
        await deploy();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Database deployment failed:', error);
        return NextResponse.json(
            { error: 'Database deployment failed' },
            { status: 500 }
        );
    }
}
