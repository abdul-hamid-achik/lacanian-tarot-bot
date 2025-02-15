import { db } from './db/client';
import { tarotCard, cardTheme, type TarotCard } from './db/schema';
import { eq, sql } from 'drizzle-orm';
import type { UserPersona } from './persona';

export interface DrawnCard extends TarotCard {
    isReversed: boolean;
}

export async function drawPersonalizedCards(
    numCards: number,
    userPersona: UserPersona
): Promise<DrawnCard[]> {
    // For anonymous users or users with no themes, just draw random cards
    if (userPersona.themes.length === 0) {
        const cards = await db
            .select({
                card: tarotCard
            })
            .from(tarotCard)
            .orderBy(sql`random()`)
            .limit(numCards);

        return cards.map(({ card }) => ({
            ...card,
            isReversed: Math.random() > 0.5
        }));
    }

    // Calculate theme-based weights for authenticated users
    const themeWeights = userPersona.themes.reduce((acc, theme) => ({
        ...acc,
        [theme.id]: theme.weight
    }), {} as Record<string, number>);

    // Query cards with theme relevance
    const cards = await db
        .select({
            card: tarotCard,
            relevance: sql<number>`
        SUM(CASE
          WHEN ct."themeId" = ANY(${Object.keys(themeWeights)})
          THEN ct.relevance * ${sql.raw(Object.values(themeWeights).join(' + '))}
          ELSE 0
        END)
      `.as('theme_relevance')
        })
        .from(tarotCard)
        .leftJoin(
            cardTheme,
            eq(tarotCard.id, cardTheme.cardId)
        )
        .groupBy(tarotCard.id)
        .orderBy(sql`random() * theme_relevance DESC`)
        .limit(numCards);

    // Add reversal probability (50% chance)
    return cards.map(({ card }) => ({
        ...card,
        isReversed: Math.random() > 0.5
    }));
}

export async function getCardById(id: string): Promise<TarotCard | undefined> {
    try {
        const response = await fetch(`/api/cards?id=${id}`);
        if (!response.ok) return undefined;
        return response.json();
    } catch (error) {
        console.error('Failed to fetch card:', error);
        return undefined;
    }
}

export async function getCardsByTheme(themeId: string): Promise<TarotCard[]> {
    return db
        .select({
            card: tarotCard,
        })
        .from(cardTheme)
        .innerJoin(
            tarotCard,
            eq(tarotCard.id, cardTheme.cardId)
        )
        .where(eq(cardTheme.themeId, themeId))
        .then(results => results.map(r => r.card));
}

export async function getRelatedCards(cardId: string): Promise<TarotCard[]> {
    // Get themes of the card
    const cardThemes = await db
        .select({ themeId: cardTheme.themeId })
        .from(cardTheme)
        .where(eq(cardTheme.cardId, cardId));

    if (cardThemes.length === 0) return [];

    // Get other cards with the same themes
    return db
        .select({ card: tarotCard })
        .from(cardTheme)
        .innerJoin(
            tarotCard,
            eq(tarotCard.id, cardTheme.cardId)
        )
        .where(sql`
      ct."themeId" = ANY(${cardThemes.map(t => t.themeId)})
      AND ct."cardId" != ${cardId}
    `)
        .groupBy(tarotCard.id)
        .orderBy(sql`COUNT(*) DESC`)
        .limit(5)
        .then(results => results.map(r => r.card));
}
