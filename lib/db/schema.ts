import type { InferSelectModel } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  json,
  uuid,
  text,
  primaryKey,
  foreignKey,
  boolean,
  integer,
  vector,
  numeric,
  jsonb,
} from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';
import { db } from './client';

export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull(),
  password: varchar('password', { length: 64 }),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable('Chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('createdAt').notNull(),
  title: text('title').notNull(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  visibility: varchar('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
});

export type Chat = InferSelectModel<typeof chat>;

export const message = pgTable('Message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  content: json('content').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type Message = InferSelectModel<typeof message>;

export const vote = pgTable(
  'Vote',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean('isUpvoted').notNull(),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  'Document',
  {
    id: uuid('id').notNull().defaultRandom(),
    createdAt: timestamp('createdAt').notNull(),
    title: text('title').notNull(),
    content: text('content'),
    kind: varchar('text', { enum: ['text', 'code'] })
      .notNull()
      .default('text'),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  },
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  'Suggestion',
  {
    id: uuid('id').notNull().defaultRandom(),
    documentId: uuid('documentId').notNull(),
    documentCreatedAt: timestamp('documentCreatedAt').notNull(),
    originalText: text('originalText').notNull(),
    suggestedText: text('suggestedText').notNull(),
    description: text('description'),
    isResolved: boolean('isResolved').notNull().default(false),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  }),
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const tarotCard = pgTable('TarotCard', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  name: text('name').notNull(),
  arcana: varchar('arcana', { enum: ['Major', 'Minor'] }).notNull(),
  suit: varchar('suit', {
    enum: ['none', 'Wands', 'Cups', 'Swords', 'Pentacles']
  }).notNull(),
  description: text('description').notNull(),
  rank: varchar('rank', { length: 8 }).notNull(), // To accommodate "Knight", "Queen", etc
  symbols: text('symbols').notNull(),
  // For the image field, we'll store the filename
  imageUrl: text('imageUrl'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export type TarotCard = InferSelectModel<typeof tarotCard>;

// Optional: If you want to track card readings
export const cardReading = pgTable('CardReading', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  cardId: uuid('cardId')
    .notNull()
    .references(() => tarotCard.id),
  position: integer('position').notNull(), // Position in the spread
  isReversed: boolean('isReversed').notNull().default(false),
  notes: text('notes'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export type CardReading = InferSelectModel<typeof cardReading>;


// Add to your schema.ts:

// --- Themes & Relationships ---
export const theme = pgTable('Theme', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 64 }).notNull().unique(), // "love", "career"
  embedding: vector('embedding', { dimensions: 384 }), // pgvector for similarity search
});

// Link users to themes (dynamic weights)
export const userTheme = pgTable('UserTheme', {
  userId: uuid('userId').references(() => user.id),
  themeId: uuid('themeId').references(() => theme.id),
  weight: numeric('weight', { precision: 3, scale: 2 }).default('0.5'),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

// Predefined card-theme relationships (from your JSON symbols/descriptions)
export const cardTheme = pgTable('CardTheme', {
  cardId: uuid('cardId').references(() => tarotCard.id),
  themeId: uuid('themeId').references(() => theme.id),
  relevance: numeric('relevance', { precision: 3, scale: 2 }).default('0.5'),
});


export type Theme = InferSelectModel<typeof theme>;
export type UserTheme = InferSelectModel<typeof userTheme>;
export type CardTheme = InferSelectModel<typeof cardTheme>;

export const spread = pgTable('Spread', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  positions: jsonb('positions').$type<Array<{
    name: string;
    description: string;
    themeMultiplier: number;
    position: number;
  }>>().notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  userId: uuid('userId').references(() => user.id),
  isPublic: boolean('isPublic').notNull().default(false),
});

export type Spread = typeof spread.$inferSelect;
export type NewSpread = typeof spread.$inferInsert;

export const messageTheme = pgTable('MessageTheme', {
  messageId: uuid('messageId').notNull(),
  themeId: uuid('themeId').references(() => theme.id).notNull(),
  userId: uuid('userId').references(() => user.id).notNull(),
  relevance: numeric('relevance', { precision: 3, scale: 2 }).default('0.5').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.messageId, table.themeId] })
}));

// Update the getMessageThemes function to use the new table
export async function getMessageThemes(messageId: string) {
  return db
    .select({
      userId: messageTheme.userId,
      themeId: messageTheme.themeId,
      relevance: messageTheme.relevance
    })
    .from(messageTheme)
    .where(eq(messageTheme.messageId, messageId));
}

