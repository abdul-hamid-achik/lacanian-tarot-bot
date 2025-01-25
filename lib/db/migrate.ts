import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { config } from 'dotenv';
import { tarotCard, spread } from './schema';

// Load .env.local only in development
if (process.env.NODE_ENV !== 'production') {
  config({ path: '.env.local' });
}

const runMigrate = async () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not defined');
  }

  const sql = postgres(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzle(sql);

  console.log('⏳ Running migrations...');

  // Create vector extension if it doesn't exist
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS vector;`;
    console.log('✅ Vector extension check completed');
  } catch (err) {
    console.error('Failed to create vector extension:', err);
    process.exit(1);
  }

  const start = Date.now();
  await migrate(db, { migrationsFolder: './lib/db/migrations' });
  const end = Date.now();

  console.log('✅ Migrations completed in', end - start, 'ms');

  // Check if we need to run seeds
  const [{ count: cardsCount }] = await sql`SELECT COUNT(*)::int as count FROM "TarotCard"`;
  const [{ count: spreadsCount }] = await sql`SELECT COUNT(*)::int as count FROM "Spread"`;

  if (cardsCount === 0) {
    console.log('⏳ Seeding tarot cards...');
    // Inline the seed logic to avoid client type mismatches
    const cards = (await import('./seeds/cards.json')).default.cards.map((card: any) => ({
      name: card.name,
      arcana: card.arcana,
      suit: card.suit,
      description: card.description,
      rank: card.rank,
      symbols: card.symbols,
      imageUrl: generateImageUrl(card),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await sql`
      INSERT INTO "TarotCard" (
        name, arcana, suit, description, rank, symbols, "imageUrl", "createdAt", "updatedAt"
      )
      SELECT * FROM json_to_recordset(${JSON.stringify(cards)})
      AS x(
        name text, arcana text, suit text, description text, rank text,
        symbols text, "imageUrl" text, "createdAt" timestamptz, "updatedAt" timestamptz
      )
    `;
    console.log('✅ Tarot cards seeded');
  } else {
    console.log('ℹ️ Tarot cards already exist, skipping seed');
  }

  if (spreadsCount === 0) {
    console.log('⏳ Seeding spreads...');
    // Inline the seed logic to avoid client type mismatches
    const spreads = (await import('./seeds/spreads.json')).spreads;
    for (const spreadData of spreads) {
      await sql`
        INSERT INTO "Spread" (
          name, description, positions, "isPublic", "createdAt", "updatedAt"
        ) VALUES (
          ${spreadData.name},
          ${spreadData.description},
          ${JSON.stringify(spreadData.positions)},
          ${spreadData.isPublic},
          ${new Date()},
          ${new Date()}
        )
      `;
    }
    console.log('✅ Spreads seeded');
  } else {
    console.log('ℹ️ Spreads already exist, skipping seed');
  }

  await sql.end();
  process.exit(0);
};

// Helper function from seed-cards.ts
function generateImageUrl(card: any): string {
  if (card.arcana === 'Major') {
    const number = card.rank.padStart(2, '0');
    const name = card.name
      .replace(/\s+/g, '')
      .replace(/^The/, '');
    return `/images/${number}-${name}.png`;
  } else {
    const number = card.rank === 'Page' ? '11'
      : card.rank === 'Knight' ? '12'
        : card.rank === 'Queen' ? '13'
          : card.rank === 'King' ? '14'
            : card.rank.padStart(2, '0');
    return `/images/${card.suit}${number}.png`;
  }
}

runMigrate().catch((err) => {
  console.error('❌ Migration failed');
  console.error(err);
  process.exit(1);
});
