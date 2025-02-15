import type { PersonalizedCardSelector } from './card-selector';
import type { UserPersona } from './persona';
import type { Spread, TarotCard, SpreadPosition } from './db/types';
import { spread as spreadTable } from './db/schema';

export interface SpreadPosition {
    name: string;
    description: string;
    themeMultiplier: number;
    position: number;
}

export type Spread = Spread;

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
                description: 'The current situation',
                themeMultiplier: 1.2,
                position: 1
            },
            {
                name: 'Challenge',
                description: 'What crosses you',
                themeMultiplier: 1.0,
                position: 2
            },
            {
                name: 'Foundation',
                description: 'The basis of the situation',
                themeMultiplier: 0.8,
                position: 3
            },
            {
                name: 'Past',
                description: 'Recent past influences',
                themeMultiplier: 0.7,
                position: 4
            },
            {
                name: 'Crown',
                description: 'Your thoughts and aspirations',
                themeMultiplier: 1.1,
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
                description: 'How you see yourself',
                themeMultiplier: 1.2,
                position: 7
            },
            {
                name: 'Environment',
                description: 'How others see you',
                themeMultiplier: 0.9,
                position: 8
            },
            {
                name: 'Hopes/Fears',
                description: 'Your hopes and fears',
                themeMultiplier: 1.1,
                position: 9
            },
            {
                name: 'Outcome',
                description: 'The final outcome',
                themeMultiplier: 1.3,
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
        try {
            const response = await fetch(`/api/spreads?id=${spreadId}`);
            if (!response.ok) return null;
            return response.json();
        } catch (error) {
            console.error('Failed to fetch spread:', error);
            return null;
        }
    }

    async drawSpreadCards(
        spreadId: string,
        persona: UserPersona,
        userQuery?: string
    ): Promise<Array<TarotCard & { position: SpreadPosition }>> {
        const spread = await this.getSpread(spreadId);
        if (!spread) throw new Error('Spread not found');

        const positions = spread.positions as SpreadPosition[];
        const cards: Array<TarotCard & { position: SpreadPosition }> = [];

        for (const position of positions) {
            const [card] = await this.cardSelector.selectCards({
                persona,
                numCards: 1,
                userQuery,
                spreadPosition: position
            });
            cards.push({ ...card, position });
        }

        return cards;
    }
}

export async function getPublicSpreads(): Promise<Spread[]> {
    try {
        const response = await fetch('/api/spreads');
        if (!response.ok) return [];
        return response.json();
    } catch (error) {
        console.error('Failed to fetch public spreads:', error);
        return [];
    }
}

export async function getUserSpreads(userId: string): Promise<Spread[]> {
    try {
        const response = await fetch(`/api/spreads?userId=${userId}`);
        if (!response.ok) return [];
        return response.json();
    } catch (error) {
        console.error('Failed to fetch user spreads:', error);
        return [];
    }
}

export async function getSpreadById(id: string): Promise<Spread | undefined> {
    try {
        const response = await fetch(`/api/spreads?id=${id}`);
        if (!response.ok) return undefined;
        return response.json();
    } catch (error) {
        console.error('Failed to fetch spread:', error);
        return undefined;
    }
}

export async function createSpread(
    data: Omit<Spread, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Spread> {
    const response = await fetch('/api/spreads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error('Failed to create spread');
    }

    return response.json();
}

export function validateSpreadPositions(positions: unknown): positions is SpreadPosition[] {
    if (!Array.isArray(positions)) return false;
    return positions.every(pos => 
        typeof pos === 'object' &&
        pos !== null &&
        typeof pos.name === 'string' &&
        typeof pos.description === 'string' &&
        typeof pos.themeMultiplier === 'number' &&
        typeof pos.position === 'number'
    );
}

export type CreateSpreadInput = {
    name: string;
    description: string;
    positions: SpreadPosition[];
    isPublic?: boolean;
    userId?: string;
};
