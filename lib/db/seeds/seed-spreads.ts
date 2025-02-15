import { spreads } from './spreads.json';
import { db } from '../client';
import { spread } from '../schema';

type SpreadInsert = typeof spread.$inferInsert;
type SpreadPosition = {
  name: string;
  description: string;
  themeMultiplier: number;
  position: number;
};

type SpreadData = {
  name: string;
  description: string;
  positions: Array<{
    name: string;
    description: string;
    theme_multiplier: number;
    position: number;
  }>;
  is_public: boolean;
};

export async function seedSpreads() {
  try {
    const spreadsData = (spreads as SpreadData[]).map((spreadData) => {
      const positions: SpreadPosition[] = spreadData.positions.map(pos => ({
        name: pos.name,
        description: pos.description,
        themeMultiplier: pos.theme_multiplier,
        position: pos.position,
      }));

      const insertData: SpreadInsert = {
        name: spreadData.name,
        description: spreadData.description,
        positions,
        isPublic: spreadData.is_public,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return insertData;
    });

    await db.insert(spread).values(spreadsData);
    console.log('Successfully seeded spreads');
  } catch (error) {
    console.error('Error seeding spreads:', error);
    throw error;
  }
}
