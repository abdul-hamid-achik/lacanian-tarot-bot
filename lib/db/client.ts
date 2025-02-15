// Only import server-only in production
if (process.env.NODE_ENV === 'production') {
  require('server-only');
}

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import ws from 'ws';
import { sql } from 'drizzle-orm';

// Update the connection string for local development
const connectionString = process.env.NODE_ENV === 'development'
  ? 'postgres://postgres:postgres@localhost:5432/postgres'
  : process.env.DATABASE_URL;

let db: any;

if (process.env.NODE_ENV === 'development') {
  // Use postgres-js for local development
  const client = postgres(connectionString!, {
    max: 1,
    prepare: false,
  });
  db = drizzlePostgres(client, { schema });
  console.log('Connected to PostgreSQL via postgres-js');
} else {
  // Use Neon serverless for production
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString });
  db = drizzle(pool, { schema });

  pool.on('error', (error: Error) => {
    console.error('Unexpected error on idle client', error.stack);
  });

  pool.on('connect', () => {
    console.log('Connected to PostgreSQL via Neon serverless');
  });
}

export { db, sql };
