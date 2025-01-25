import { db } from './db/client';
import { spread as spreadTable } from './db/schema';
import { eq } from 'drizzle-orm';
import { PersonalizedCardSelector } from './card-selector';
import type { UserPersona } from './persona';
import type { TarotCard } from './db/schema';
import type { InferSelectModel } from 'drizzle-orm';

export interface SpreadPosition {
    name: string;
    description: string;
    themeMultiplier: number;
    position: number;
}

export type Spread = InferSelectModel<typeof spreadTable>;

export const PREDEFINED_SPREADS: Record<string, Omit<Spread, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> = {
    'past-present-future': {
        name: 'Past, Present, Future',
        description: 'A classic three-card spread exploring temporal aspects of your question',
        isPublic: true,
        positions: [
            {
                name: 'Past',
                description: 'Foundation and history that led to the current situation',
                themeMultiplier: 0.8,
                position: 1
            },
            {
                name: 'Present',
                description: 'Current energies and immediate influences',
                themeMultiplier: 1.2,
                position: 2
            },
            {
                name: 'Future',
                description: 'Potential outcome and emerging energies',
                themeMultiplier: 1.0,
                position: 3
            }
        ]
    },
    'celtic-cross': {
        name: 'Celtic Cross',
        description: 'A comprehensive ten-card spread for deep insight',
        isPublic: true,
        positions: [
            {
                name: 'Present',
                description: 'The current situation or question',
                themeMultiplier: 1.2,
                position: 1
            },
            {
                name: 'Challenge',
                description: 'What crosses or challenges you',
                themeMultiplier: 1.1,
                position: 2
            },
            {
                name: 'Foundation',
                description: 'The basis of the situation',
                themeMultiplier: 0.9,
                position: 3
            },
            {
                name: 'Past',
                description: 'Recent past influences',
                themeMultiplier: 0.8,
                position: 4
            },
            {
                name: 'Crown',
                description: 'Potential outcome',
                themeMultiplier: 1.0,
                position: 5
            },
            {
                name: 'Future',
                description: 'Near future influences',
                themeMultiplier: 1.0,
                position: 6
            },
            {
                name: 'Self',
                description: 'Your attitude and approach',
                themeMultiplier: 1.1,
                position: 7
            },
            {
                name: 'Environment',
                description: 'External influences',
                themeMultiplier: 0.9,
                position: 8
            },
            {
                name: 'Hopes/Fears',
                description: 'Your inner emotions',
                themeMultiplier: 1.1,
                position: 9
            },
            {
                name: 'Outcome',
                description: 'Final outcome',
                themeMultiplier: 1.2,
                position: 10
            }
        ]
    }
};

export class SpreadManager {
    private cardSelector: PersonalizedCardSelector;

    constructor(cardSelector: PersonalizedCardSelector) {
        this.cardSelector = cardSelector;
    }

    async getSpread(spreadId: string): Promise<Spread | null> {
        const result = await db
            .select()
            .from(spreadTable)
            .where(eq(spreadTable.id, spreadId))
            .limit(1);

        return result[0] || null;
    }

    async drawSpreadCards(
        spreadId: string,
        persona: UserPersona,
        userQuery?: string
    ): Promise<Array<TarotCard & { position: SpreadPosition }>> {
        const spread = await this.getSpread(spreadId);
        if (!spread) throw new Error(`Spread not found: ${spreadId}`);

        const cards: Array<TarotCard & { position: SpreadPosition }> = [];

        // Draw cards for each position
        for (const position of spread.positions) {
            const [card] = await this.cardSelector.selectCards({
                persona,
                numCards: 1,
                userQuery,
                spreadPosition: position
            });

            cards.push({
                ...card,
                position
            });
        }

        return cards;
    }

    async createSpread(spread: Omit<Spread, 'id'>): Promise<Spread> {
        const [result] = await db
            .insert(spreadTable)
            .values({
                name: spread.name,
                description: spread.description,
                positions: spread.positions
            })
            .returning();

        return result;
    }

    async listSpreads(): Promise<Spread[]> {
        return db.select().from(spreadTable);
    }
}

export async function getPublicSpreads(): Promise<Spread[]> {
    return db.select().from(spreadTable).where(eq(spreadTable.isPublic, true));
}

export async function getUserSpreads(userId: string): Promise<Spread[]> {
    return db
        .select()
        .from(spreadTable)
        .where(eq(spreadTable.userId, userId));
}

export async function getSpreadById(id: string): Promise<Spread | undefined> {
    const results = await db
        .select()
        .from(spreadTable)
        .where(eq(spreadTable.id, id))
        .limit(1);

    return results[0];
}

export async function createSpread(
    data: Omit<Spread, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Spread> {
    const [newSpread] = await db.insert(spreadTable).values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
    }).returning();

    return newSpread;
}

export async function updateSpread(
    id: string,
    data: Partial<Omit<Spread, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Spread | undefined> {
    const [updatedSpread] = await db
        .update(spreadTable)
        .set({
            ...data,
            updatedAt: new Date(),
        })
        .where(eq(spreadTable.id, id))
        .returning();

    return updatedSpread;
}

export async function deleteSpread(id: string): Promise<boolean> {
    const [deletedSpread] = await db
        .delete(spreadTable)
        .where(eq(spreadTable.id, id))
        .returning();

    return !!deletedSpread;
}

export function validateSpreadPositions(positions: unknown): positions is SpreadPosition[] {
    if (!Array.isArray(positions)) return false;

    return positions.every(position =>
        typeof position === 'object' &&
        position !== null &&
        'name' in position &&
        'description' in position &&
        typeof position.name === 'string' &&
        typeof position.description === 'string'
    );
}

export type CreateSpreadInput = {
    name: string;
    description: string;
    positions: SpreadPosition[];
    isPublic?: boolean;
    userId?: string;
};
