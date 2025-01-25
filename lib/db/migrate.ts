import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { config } from 'dotenv';

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

  await sql.end();
  process.exit(0);
};

runMigrate().catch((err) => {
  console.error('❌ Migration failed');
  console.error(err);
  process.exit(1);
});
