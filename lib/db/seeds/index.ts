import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { tarotCard, spread } from '../schema';
import { seedTarotCards } from './seed-cards';
import { seedSpreads } from './seed-spreads';
import { sql } from 'drizzle-orm';
import { config } from 'dotenv';
// Load .env.local only in development
if (process.env.NODE_ENV !== 'production') {
    config({ path: '.env.local' });
}

export async function runSeed() {
    if (!process.env.POSTGRES_URL) {
        throw new Error('POSTGRES_URL is not defined');
    }

    console.log('⏳ Seeding database...');
    const start = Date.now();

    // Create a new postgres client
    const client = postgres(process.env.POSTGRES_URL);

    try {
        // Check if we need to run seeds
        const cardsCount = Number((await client`SELECT COUNT(*) FROM "tarot_card"`)[0].count);
        const spreadsCount = Number((await client`SELECT COUNT(*) FROM "spread"`)[0].count);

        let seeded = false;

        if (cardsCount === 0) {
            console.log('⏳ Seeding tarot cards...');
            await seedTarotCards(client);
            console.log('✅ Tarot cards seeded');
            seeded = true;
        }

        if (spreadsCount === 0) {
            console.log('⏳ Seeding spreads...');
            await seedSpreads(client);
            console.log('✅ Spreads seeded');
            seeded = true;
        }

        const end = Date.now();
        if (seeded) {
            console.log('✅ Seeding completed in', end - start, 'ms');
        } else {
            console.log('ℹ️ No seeding required - tables already have data');
        }
    } finally {
        // Always close the client
        await client.end();
    }
}

// Only run immediately if this is the main module
if (require.main === module) {
    runSeed().catch((err) => {
        console.error('❌ Seeding failed');
        console.error(err);
        process.exit(1);
    });
}
