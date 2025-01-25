import { sql } from 'drizzle-orm';
import { pgTable, vector } from 'drizzle-orm/pg-core';
import { tarotCard } from '../schema';

// Enable pgvector extension
export const beforeMigration = async (db: any) => {
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector;`);
};

// Add vector field to tarot cards
export const migration = async (db: any) => {
    await db.schema.alterTable(tarotCard).addColumn(
        'embedding',
        vector('embedding', { dimensions: 384 })
    );

    // Create an index for similarity search
    await db.execute(
        sql`CREATE INDEX IF NOT EXISTS tarot_card_embedding_idx ON "TarotCard" USING ivfflat (embedding vector_cosine_ops)`
    );
};
