import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { cardReading, userTheme, theme, vote } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { StatusCodes } from 'http-status-codes';
import { createTarotError } from '@/lib/errors';

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json(
                createTarotError(StatusCodes.UNAUTHORIZED, "You must be attuned to view your analytics"),
                { status: StatusCodes.UNAUTHORIZED }
            );
        }

        const userId = session.user.id;
        if (!userId) {
            return NextResponse.json(
                createTarotError(StatusCodes.BAD_REQUEST, "Your spiritual signature is unclear"),
                { status: StatusCodes.BAD_REQUEST }
            );
        }

        // Get total readings
        const [readingsResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(cardReading)
            .where(eq(cardReading.userId, userId));

        // Get theme changes
        const themeChanges = await db
            .select({
                name: theme.name,
                weight: userTheme.weight,
            })
            .from(userTheme)
            .innerJoin(theme, eq(userTheme.themeId, theme.id))
            .where(eq(userTheme.userId, userId));

        // Get upvote ratio
        const [voteStats] = await db
            .select({
                upvotes: sql<number>`sum(case when is_upvoted then 1 else 0 end)`,
                total: sql<number>`count(*)`,
            })
            .from(vote)
            .where(eq(vote.userId, userId));

        const upvoteRatio = voteStats.total > 0 ? voteStats.upvotes / voteStats.total : 0;

        return NextResponse.json({
            totalReadings: readingsResult.count,
            themeChanges,
            upvoteRatio,
        });
    } catch (error) {
        console.error('Failed to fetch analytics:', error);
        return NextResponse.json(
            createTarotError(StatusCodes.INTERNAL_SERVER_ERROR, "The cosmic patterns are unclear"),
            { status: StatusCodes.INTERNAL_SERVER_ERROR }
        );
    }
} 