import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import { seedTarotCards } from './seed-cards';
import { seedSpreads } from './seed-spreads';

const runSeed = async () => {
    if (!process.env.POSTGRES_URL) {
        throw new Error('POSTGRES_URL is not defined');
    }

    const client = new Client(process.env.POSTGRES_URL);
    await client.connect();
    const db = drizzle(client);

    console.log('⏳ Seeding database...');
    const start = Date.now();

    await seedTarotCards(db);
    await seedSpreads(db);

    const end = Date.now();
    console.log('✅ Seeding completed in', end - start, 'ms');

    await client.end();
    process.exit(0);
};

runSeed().catch((err) => {
    console.error('❌ Seeding failed');
    console.error(err);
    process.exit(1);
});
