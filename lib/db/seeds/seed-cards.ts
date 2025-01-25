import { drizzle } from 'drizzle-orm/node-postgres';
import { TarotCard, tarotCard } from '../schema';
import cardsData from './cards.json';

export async function seedTarotCards(db: ReturnType<typeof drizzle>) {
    const cards = cardsData.cards.map(card => ({
        name: card.name,
        arcana: card.arcana,
        suit: card.suit,
        description: card.description,
        rank: card.rank,
        symbols: card.symbols,
        // Generate image URL based on card name/type
        imageUrl: generateImageUrl(card),
        createdAt: new Date(),
        updatedAt: new Date(),
    }));

    await db.insert(tarotCard).values(cards as unknown as TarotCard[]);
}

function generateImageUrl(card: typeof cardsData.cards[0]): string {
    if (card.arcana === 'Major') {
        // Convert "The Fool" to "00-TheFool.png"
        const number = card.rank.padStart(2, '0');
        const name = card.name
            .replace(/\s+/g, '') // Remove all spaces
            .replace(/^The/, ''); // Remove leading "The"
        return `/images/${number}-${name}.png`;
    } else {
        // Convert "Ace of Wands" to "Wands01.png"
        const number = card.rank === 'Page' ? '11'
            : card.rank === 'Knight' ? '12'
                : card.rank === 'Queen' ? '13'
                    : card.rank === 'King' ? '14'
                        : card.rank.padStart(2, '0');
        return `/images/${card.suit}${number}.png`;
    }
}
