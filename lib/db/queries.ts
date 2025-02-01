import 'server-only';

import { genSaltSync, hashSync } from 'bcrypt-ts';
import { and, asc, desc, eq, gt, gte } from 'drizzle-orm';
import type { InferInsertModel } from 'drizzle-orm';

import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  type Message,
  message,
  vote,
} from './schema';
import { db } from './client';
import { DatabaseErrors } from '../errors';

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error(DatabaseErrors.USER_NOT_FOUND);
    throw error;
  }
}

export async function createUser(email: string, password: string) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  try {
    const newUser: typeof user.$inferInsert = {
      email,
      password: hash,
    };
    return await db.insert(user).values(newUser);
  } catch (error) {
    console.error(DatabaseErrors.USER_CREATE_FAILED);
    throw error;
  }
}

export async function saveChat({
  userId,
  title,
}: {
  userId: string;
  title: string;
}) {
  try {
    const newChat: typeof chat.$inferInsert = {
      createdAt: new Date(),
      userId,
      title,
      visibility: 'private',
    };
    return await db.insert(chat).values(newChat);
  } catch (error) {
    console.error(DatabaseErrors.CHAT_SAVE_FAILED);
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    return await db.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error(DatabaseErrors.CHAT_DELETE_FAILED);
    throw error;
  }
}

export async function getChatsByUserId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(chat)
      .where(eq(chat.userId, id))
      .orderBy(desc(chat.createdAt));
  } catch (error) {
    console.error(DatabaseErrors.CHAT_FETCH_FAILED);
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error(DatabaseErrors.CHAT_BY_ID_FAILED);
    throw error;
  }
}

export async function saveMessages({ messages }: { messages: Array<Message> }) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    console.error(DatabaseErrors.MESSAGE_SAVE_FAILED);
    throw error;
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    console.error(DatabaseErrors.MESSAGE_FETCH_FAILED);
    throw error;
  }
}

export async function voteMessage({
  userId,
  chatId,
  messageId,
  type,
}: {
  userId: string;
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(eq(vote.messageId, messageId));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }

    const newVote: InferInsertModel<typeof vote> = {
      userId,
      chatId,
      messageId,
      isUpvoted: type === 'up',
    };
    return await db.insert(vote).values(newVote);
  } catch (error) {
    console.error(DatabaseErrors.VOTE_SAVE_FAILED);
    throw error;
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    console.error(DatabaseErrors.VOTE_FETCH_FAILED);
    throw error;
  }
}

export async function saveDocument({
  title,
  kind,
  content,
  userId,
}: {
  title: string;
  kind: 'text' | 'code';
  content: string;
  userId: string;
}) {
  try {
    const newDocument: typeof document.$inferInsert = {
      title,
      kind,
      content,
      userId,
      createdAt: new Date(),
    };
    return await db.insert(document).values(newDocument);
  } catch (error) {
    console.error(DatabaseErrors.DOCUMENT_SAVE_FAILED);
    throw error;
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    console.error(DatabaseErrors.DOCUMENT_FETCH_FAILED);
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    console.error(DatabaseErrors.DOCUMENT_BY_ID_FAILED);
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)));
  } catch (error) {
    console.error(DatabaseErrors.DOCUMENT_DELETE_FAILED);
    throw error;
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    console.error(DatabaseErrors.SUGGESTION_SAVE_FAILED);
    throw error;
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(eq(suggestion.documentId, documentId));
  } catch (error) {
    console.error(DatabaseErrors.SUGGESTION_FETCH_FAILED);
    throw error;
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    console.error(DatabaseErrors.MESSAGE_BY_ID_FAILED);
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    return await db
      .delete(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );
  } catch (error) {
    console.error(DatabaseErrors.MESSAGE_DELETE_FAILED);
    throw error;
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    console.error(DatabaseErrors.CHAT_VISIBILITY_UPDATE_FAILED);
    throw error;
  }
}

export async function upsertVote({
  userId,
  chatId,
  messageId,
  type,
}: {
  userId: string;
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  const existingVote = await db
    .select()
    .from(vote)
    .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));

  if (existingVote.length > 0) {
    return await db
      .update(vote)
      .set({ isUpvoted: type === 'up' })
      .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
  }
  return await db.insert(vote).values({
    userId,
    chatId,
    messageId,
    isUpvoted: type === 'up',
  });
}
