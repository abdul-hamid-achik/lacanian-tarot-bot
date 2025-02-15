import 'server-only';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';

// Initialize Drizzle with the Vercel Postgres client
const db = drizzle(sql);

export { db };
