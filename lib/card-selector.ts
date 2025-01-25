import { eq, sql } from 'drizzle-orm';
import { db } from './db/client';
import { tarotCard, cardTheme, type TarotCard } from './db/schema';
import type { UserPersona } from './persona';
import { TextEmbedder } from './embeddings';

interface SelectionParams {
    persona: UserPersona;
    numCards: number;
    userQuery?: string;
    spreadPosition?: {
        name: string;
        themeMultiplier: number;
        position: number;
    };
}

interface CardWithRelevance {
    card: TarotCard;
    relevance: number;
}

export class PersonalizedCardSelector {
    private embeddingModel: TextEmbedder;
    private similarityThreshold: number;

    constructor(embeddingModel?: TextEmbedder, similarityThreshold = 0.85) {
        this.embeddingModel = embeddingModel || new TextEmbedder();
        this.similarityThreshold = similarityThreshold;
    }

    public async selectCards(params: SelectionParams): Promise<TarotCard[]> {
        const { persona, numCards, userQuery, spreadPosition } = params;

        // Get weighted recommendations based on user themes
        const themeBasedCards = await this.getThemeBasedCards(
            persona,
            numCards * 2, // Get extra cards for diversity
            spreadPosition?.themeMultiplier
        );

        // If we have a user query, get semantic matches
        let semanticMatches: TarotCard[] = [];
        if (userQuery) {
            semanticMatches = await this.findSemanticMatches(userQuery, numCards);
        }

        // Combine and rank cards
        const rankedCards = await this.rankCandidates(
            themeBasedCards,
            semanticMatches,
            persona,
            spreadPosition,
            numCards
        );

        // Select final cards and randomize reversal
        return this.finalizeSelection(rankedCards, numCards);
    }

    private async getThemeBasedCards(
        persona: UserPersona,
        limit: number,
        positionMultiplier = 1.0
    ): Promise<CardWithRelevance[]> {
        const themeWeights = new Map(
            persona.themes.map(t => [t.id, t.weight * positionMultiplier])
        );

        const themeIds = Array.from(themeWeights.keys());
        const weightValues = Array.from(themeWeights.values());

        const results = await db
            .select({
                id: tarotCard.id,
                name: tarotCard.name,
                arcana: tarotCard.arcana,
                suit: tarotCard.suit,
                description: tarotCard.description,
                rank: tarotCard.rank,
                symbols: tarotCard.symbols,
                imageUrl: tarotCard.imageUrl,
                createdAt: tarotCard.createdAt,
                updatedAt: tarotCard.updatedAt,
                relevance: sql<number>`
          SUM(CASE
            WHEN ct."themeId" = ANY(${themeIds})
            THEN ct.relevance * ${sql.raw(weightValues.join(' + '))}
            ELSE 0
          END)
        `.as('theme_relevance')
            })
            .from(tarotCard)
            .leftJoin(cardTheme, eq(tarotCard.id, cardTheme.cardId))
            .groupBy(sql`${tarotCard.id}, ${tarotCard.name}, ${tarotCard.arcana}, ${tarotCard.suit}, ${tarotCard.description}, ${tarotCard.rank}, ${tarotCard.symbols}, ${tarotCard.imageUrl}, ${tarotCard.createdAt}, ${tarotCard.updatedAt}`)
            .orderBy(sql`theme_relevance DESC, random()`)
            .limit(limit);

        return results.map(r => ({
            card: {
                id: r.id,
                name: r.name,
                arcana: r.arcana,
                suit: r.suit,
                description: r.description,
                rank: r.rank,
                symbols: r.symbols,
                imageUrl: r.imageUrl,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt
            },
            relevance: r.relevance
        }));
    }

    private async findSemanticMatches(
        query: string,
        limit: number
    ): Promise<TarotCard[]> {
        const embeddingVector = await this.embeddingModel.embed(query);

        const results = await db
            .select({
                id: tarotCard.id,
                name: tarotCard.name,
                arcana: tarotCard.arcana,
                suit: tarotCard.suit,
                description: tarotCard.description,
                rank: tarotCard.rank,
                symbols: tarotCard.symbols,
                imageUrl: tarotCard.imageUrl,
                createdAt: tarotCard.createdAt,
                updatedAt: tarotCard.updatedAt
            })
            .from(tarotCard)
            .where(sql`embedding IS NOT NULL`)
            .orderBy(sql`embedding <=> ${embeddingVector}::vector`)
            .limit(limit);

        return results;
    }

    private async rankCandidates(
        themeBasedCards: CardWithRelevance[],
        semanticMatches: TarotCard[],
        persona: UserPersona,
        spreadPosition?: {
            name: string;
            themeMultiplier: number;
            position: number;
        },
        numCards: number = 10
    ): Promise<TarotCard[]> {
        // Combine cards and deduplicate
        const cardMap = new Map<string, { card: TarotCard; score: number }>();

        // Add theme-based cards
        themeBasedCards.forEach(({ card, relevance }) => {
            cardMap.set(card.id, {
                card,
                score: relevance
            });
        });

        // Boost scores for semantic matches
        semanticMatches.forEach((card, index) => {
            const existingEntry = cardMap.get(card.id);
            const semanticScore = 1 - index / semanticMatches.length; // Higher score for better matches

            if (existingEntry) {
                existingEntry.score += semanticScore;
            } else {
                cardMap.set(card.id, {
                    card,
                    score: semanticScore
                });
            }
        });

        // Convert to array and sort by score
        const rankedCards = Array.from(cardMap.values())
            .sort((a, b) => b.score - a.score)
            .map(entry => entry.card);

        // Apply position-specific multipliers
        if (spreadPosition) {
            const positionMultiplier = spreadPosition.themeMultiplier;
            const positionIndex = spreadPosition.position;
            const positionScore = 1 - positionIndex / numCards;

            rankedCards.forEach(card => {
                const existingEntry = cardMap.get(card.id);
                if (existingEntry) {
                    existingEntry.score += positionScore * positionMultiplier;
                } else {
                    cardMap.set(card.id, {
                        card,
                        score: positionScore * positionMultiplier
                    });
                }
            });
        }

        return rankedCards;
    }

    private finalizeSelection(
        rankedCards: TarotCard[],
        numCards: number
    ): TarotCard[] {
        return rankedCards.slice(0, numCards).map(card => ({
            ...card,
            isReversed: Math.random() > 0.5
        }));
    }
}

export async function drawPersonalizedCards(
    numCards: number,
    userPersona: Record<string, number>
): Promise<any[]> {
    const themeIds = Object.keys(userPersona);
    const themeWeights = Object.values(userPersona).join(' + ');

    // Get all cards with their theme relevance scores
    const cards = await db
        .select({
            card: tarotCard,
            themeRelevance: sql<number>`
                COALESCE(
                    SUM(
                        CASE
                            WHEN ${cardTheme.themeId} = ANY(${themeIds}::uuid[])
                            THEN ${cardTheme.relevance}::numeric * ${sql.raw(themeWeights)}::numeric
                            ELSE 0
                        END
                    ),
                    0
                )
            `
        })
        .from(tarotCard)
        .leftJoin(cardTheme, eq(tarotCard.id, cardTheme.cardId))
        .groupBy(tarotCard.id)
        .orderBy(sql`RANDOM() * themeRelevance DESC`)
        .limit(numCards);

    // Add reversal probability (50% chance)
    return cards.map(({ card }) => ({
        ...card,
        isReversed: Math.random() > 0.5
    }));
}
