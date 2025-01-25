import { config } from 'dotenv';
import postgres from 'postgres';
import { migrate } from './migrate';
import { runSeed } from './seeds';

// Load environment variables
if (process.env.NODE_ENV !== 'production') {
    config({ path: '.env.local' });
}

export async function deploy() {
    console.log('🚀 Starting database deployment...');

    try {
        // Run migrations
        console.log('⏳ Running migrations...');
        await migrate();
        console.log('✅ Migrations completed');

        // Check if we need to seed
        if (!process.env.POSTGRES_URL) {
            throw new Error('POSTGRES_URL is not defined');
        }

        const client = postgres(process.env.POSTGRES_URL);

        try {
            // Check if we have any data
            const cardsCount = Number((await client`SELECT COUNT(*) FROM "tarot_card"`)[0].count);
            const spreadsCount = Number((await client`SELECT COUNT(*) FROM "spread"`)[0].count);

            if (cardsCount === 0 || spreadsCount === 0) {
                console.log('⏳ Running seeds...');
                await runSeed();
                console.log('✅ Seeds completed');
            } else {
                console.log('ℹ️ Database already has data, skipping seeds');
            }
        } finally {
            await client.end();
        }

        console.log('✅ Database deployment completed successfully');
    } catch (error) {
        console.error('❌ Database deployment failed:', error);
        throw error; // Re-throw to be handled by the API route
    }
}
