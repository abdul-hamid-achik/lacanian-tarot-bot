import { cards } from './cards.json';
import { db } from '../client';
import { tarotCard } from '../schema';

type TarotCardInsert = typeof tarotCard.$inferInsert;
type CardData = {
  name: string;
  arcana: "Major" | "Minor";
  suit: "none" | "Wands" | "Cups" | "Swords" | "Pentacles";
  rank: string;
  description: string;
  symbols: string;
};

export async function seedTarotCards() {
  try {
    const cardsData = (cards as CardData[]).map((cardData) => {
      const arcana = cardData.arcana.toLowerCase();
      const rank = cardData.rank.toString().padStart(2, '0');
      const imageUrl = `/images/cards/${arcana}_${rank}.jpg`;

      const insertData: TarotCardInsert = {
        name: cardData.name,
        arcana: cardData.arcana,
        suit: cardData.suit,
        rank: cardData.rank,
        description: cardData.description,
        symbols: cardData.symbols,
        imageUrl,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return insertData;
    });

    await db.insert(tarotCard).values(cardsData);
    console.log('Successfully seeded tarot cards');
  } catch (error) {
    console.error('Error seeding tarot cards:', error);
    throw error;
  }
}
