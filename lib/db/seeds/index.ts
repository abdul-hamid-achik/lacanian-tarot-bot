import { db } from '../client';
import { user } from '../schema';
import { seedTarotCards } from './seed-cards';
import { seedSpreads } from './seed-spreads';
import { config } from 'dotenv';

// Load .env.local only in development
if (process.env.NODE_ENV !== 'production') {
    config({ path: '.env.local' });
}

async function runSeed() {
  console.log('⏳ Seeding database...');
  try {
    // Add your seed data here
    await db.insert(user).values([
      {
        email: 'test@example.com',
        password: 'password123',
      },
    ]);

    await seedTarotCards();
    await seedSpreads();

    console.log('✅ Database seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding database:');
    console.error('Unknown error:', error);
    process.exit(1);
  }
}

runSeed();
