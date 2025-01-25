import { drizzle } from 'drizzle-orm/node-postgres';
import { spread } from '../schema';
import { spreads } from './spreads.json';

export async function seedSpreads(db: ReturnType<typeof drizzle>) {
    for (const spreadData of spreads) {
        await db.insert(spread).values({
            ...spreadData,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }
}
