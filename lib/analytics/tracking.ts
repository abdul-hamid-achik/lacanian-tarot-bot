import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { user, cardReading, userTheme, theme, vote } from '@/lib/db/schema';

export interface UserStats {
    totalReadings: number;
    themeChanges: Array<{
        theme: string;
        initial_weight: number;
        current_weight: number;
    }>;
    upvoteRatio: number;
}

export async function trackUserProgress(userId: string): Promise<UserStats> {
    const stats = await db
        .select({
            totalReadings: sql<number>`COUNT(DISTINCT cr.id)`,
            themeChanges: sql<Array<{
                theme: string;
                initial_weight: number;
                current_weight: number;
            }>>`
        array_agg(
          json_build_object(
            'theme', t.name,
            'initial_weight', first_value(ut.weight) OVER (PARTITION BY t.id ORDER BY ut."updatedAt"),
            'current_weight', last_value(ut.weight) OVER (PARTITION BY t.id ORDER BY ut."updatedAt")
          )
        )
      `,
            upvoteRatio: sql<number>`
        COALESCE(
          SUM(CASE WHEN v."isUpvoted" THEN 1 ELSE 0 END)::float /
          NULLIF(COUNT(v.*), 0)::float,
          0
        )
      `
        })
        .from(user)
        .leftJoin(cardReading, sql`${cardReading.userId} = ${user.id}`)
        .leftJoin(userTheme, sql`${userTheme.userId} = ${user.id}`)
        .leftJoin(theme, sql`${userTheme.themeId} = ${theme.id}`)
        .leftJoin(vote, sql`${user.id} = ${vote.userId}`)
        .where(sql`${user.id} = ${userId}`)
        .groupBy(user.id);

    return stats[0] || {
        totalReadings: 0,
        themeChanges: [],
        upvoteRatio: 0
    };
}

export async function recordWeightChange({
    userId,
    themeId,
    oldWeight,
    newWeight,
    source,
    timestamp = new Date()
}: {
    userId: string;
    themeId: string;
    oldWeight: number;
    newWeight: number;
    source: string;
    timestamp?: Date;
}) {
    await db.insert(userTheme).values({
        userId: userId,
        themeId: themeId,
        weight: newWeight.toString(),
        updatedAt: timestamp
    });
}

export async function recordFeedback({
    userId,
    chatId,
    messageId,
    type,
    timestamp = new Date()
}: {
    userId: string;
    chatId: string;
    messageId: string;
    type: 'upvote' | 'downvote';
    timestamp?: Date;
}) {
    await db.insert(vote).values({
        userId: userId,
        chatId: chatId,
        messageId: messageId,
        isUpvoted: type === 'upvote'
    });
}
