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

export const user = pgTable('user', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull(),
  password: varchar('password', { length: 64 }),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable('chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('created_at').notNull(),
  title: text('title').notNull(),
  userId: uuid('user_id')
    .references(() => user.id),
  visibility: varchar('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
});

export type Chat = InferSelectModel<typeof chat>;

export const message = pgTable('message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chat_id')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  content: json('content').notNull(),
  createdAt: timestamp('created_at').notNull(),
});

export type Message = InferSelectModel<typeof message>;

export const vote = pgTable(
  'vote',
  {
    chatId: uuid('chat_id')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('message_id')
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean('is_upvoted').notNull(),
    userId: uuid('user_id')
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
  'document',
  {
    id: uuid('id').notNull().defaultRandom(),
    createdAt: timestamp('created_at').notNull(),
    title: text('title').notNull(),
    content: text('content'),
    kind: varchar('kind', { enum: ['text', 'code'] })
      .notNull()
      .default('text'),
    userId: uuid('user_id')
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
  'suggestion',
  {
    id: uuid('id').notNull().defaultRandom(),
    documentId: uuid('document_id').notNull(),
    documentCreatedAt: timestamp('document_created_at').notNull(),
    originalText: text('original_text').notNull(),
    suggestedText: text('suggested_text').notNull(),
    description: text('description'),
    isResolved: boolean('is_resolved').notNull().default(false),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('created_at').notNull(),
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

export const tarotCard = pgTable('tarot_card', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  name: text('name').notNull(),
  arcana: varchar('arcana', { enum: ['Major', 'Minor'] }).notNull(),
  suit: varchar('suit', {
    enum: ['none', 'Wands', 'Cups', 'Swords', 'Pentacles']
  }).notNull(),
  description: text('description').notNull(),
  rank: varchar('rank', { length: 8 }).notNull(),
  symbols: text('symbols').notNull(),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type TarotCard = InferSelectModel<typeof tarotCard>;

export const cardReading = pgTable('card_reading', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id),
  cardId: uuid('card_id')
    .notNull()
    .references(() => tarotCard.id),
  position: integer('position').notNull(),
  isReversed: boolean('is_reversed').notNull().default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type CardReading = InferSelectModel<typeof cardReading>;

export const theme = pgTable('theme', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 64 }).notNull().unique(),
  embedding: vector('embedding', { dimensions: 384 }),
});

export const userTheme = pgTable('user_theme', {
  userId: uuid('user_id').references(() => user.id),
  themeId: uuid('theme_id').references(() => theme.id),
  weight: numeric('weight', { precision: 3, scale: 2 }).default('0.5'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const cardTheme = pgTable('card_theme', {
  cardId: uuid('card_id').references(() => tarotCard.id),
  themeId: uuid('theme_id').references(() => theme.id),
  relevance: numeric('relevance', { precision: 3, scale: 2 }).default('0.5'),
});

export type Theme = InferSelectModel<typeof theme>;
export type UserTheme = InferSelectModel<typeof userTheme>;
export type CardTheme = InferSelectModel<typeof cardTheme>;

export const spread = pgTable('spread', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  positions: jsonb('positions').$type<Array<{
    name: string;
    description: string;
    themeMultiplier: number;
    position: number;
  }>>().notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  userId: uuid('user_id').references(() => user.id),
  isPublic: boolean('is_public').notNull().default(false),
});

export type Spread = typeof spread.$inferSelect;
export type NewSpread = typeof spread.$inferInsert;

export const messageTheme = pgTable('message_theme', {
  messageId: uuid('message_id').notNull(),
  themeId: uuid('theme_id').references(() => theme.id).notNull(),
  userId: uuid('user_id').references(() => user.id).notNull(),
  relevance: numeric('relevance', { precision: 3, scale: 2 }).default('0.5').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
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

// Anonymous user session management
export const anonymousUser = pgTable('anonymous_user', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  sessionId: text('session_id').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastActive: timestamp('last_active').notNull().defaultNow(),
});

export type AnonymousUser = InferSelectModel<typeof anonymousUser>;

export const anonymousUserTheme = pgTable('anonymous_user_theme', {
  anonymousUserId: uuid('anonymous_user_id')
    .references(() => anonymousUser.id)
    .notNull(),
  themeId: uuid('theme_id')
    .references(() => theme.id)
    .notNull(),
  weight: numeric('weight', { precision: 3, scale: 2 }).default('0.5'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.anonymousUserId, table.themeId] })
}));

// Anonymous votes
export const anonymousVote = pgTable('anonymous_vote', {
  chatId: uuid('chat_id')
    .notNull()
    .references(() => chat.id),
  messageId: uuid('message_id')
    .notNull()
    .references(() => message.id),
  isUpvoted: boolean('is_upvoted').notNull(),
  anonymousUserId: uuid('anonymous_user_id')
    .notNull()
    .references(() => anonymousUser.id),
}, (table) => ({
  pk: primaryKey({ columns: [table.chatId, table.messageId, table.anonymousUserId] })
}));

