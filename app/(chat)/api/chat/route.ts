import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { PersonaManager } from '@/lib/persona';
import { PersonalizedCardSelector } from '@/lib/card-selector';
import { db } from '@/lib/db/client';
import { cardReading, type Spread } from '@/lib/db/schema';
import { customModel } from '@/lib/ai';
import {
  deleteChatById,
  getChatById,
  getChatsByUserId,
  saveChat,
  getOrCreateAnonymousUser,
} from '@/lib/db/queries';
import { generateTitleFromUserMessage } from '../../actions';
import { sql } from 'drizzle-orm';
import { drawPersonalizedCards } from '@/lib/cards';
import { getSpreadById } from '@/lib/spreads';
import { StatusCodes } from 'http-status-codes';
import { createTarotResponse, createTarotError, TarotAPIError } from '@/lib/errors';
import { cookies } from 'next/headers';
import { OpenAI } from 'openai';
import { createDataStream, createDataStreamResponse } from 'ai';
import { z } from 'zod';
import { DataStreamWriter } from 'ai';

interface SpreadWithPositions extends Spread {
  positions: {
    name: string;
    description: string;
    themeMultiplier: number;
    position: number;
  }[];
}

const personaManager = new PersonaManager();
const cardSelector = new PersonalizedCardSelector();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function drawRandomTarotCards(numCards: number) {
  return await db.select().from(cardReading).orderBy(sql`random()`).limit(numCards);
}

function detectTarotIntent(message: string): {
  type: 'spread' | 'reading' | 'none';
  spreadId?: string;
} {
  const msg = message.toLowerCase();

  const spreadMatch = msg.match(/use spread (\w+)/);
  if (spreadMatch) {
    return { type: 'spread', spreadId: spreadMatch[1] };
  }

  const readingKeywords = ['tarot', 'cards', 'reading', 'draw'];
  if (readingKeywords.some(keyword => msg.includes(keyword))) {
    return { type: 'reading' };
  }

  return { type: 'none' };
}

function parseTarotRequest(message: string): { numCards: number } {
  const numCardsMatch = message.match(/(\d+)\s+cards?/);
  return {
    numCards: numCardsMatch ? Number.parseInt(numCardsMatch[1], 10) : 3,
  };
}

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  name: z.string().optional(),
});

type ChatMessage = z.infer<typeof ChatMessageSchema>;

const ChatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.string(),
    content: z.string()
  })),
  chatId: z.string(),
  userId: z.string().optional(),
  spread: z.any().optional()
});

const ChatResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  userId: z.string().optional(),
  anonymousUserId: z.string().optional(),
  isPublic: z.boolean(),
});

const ChatListResponseSchema = z.array(ChatResponseSchema);

const ChatVoteRequestSchema = z.object({
  chatId: z.string(),
  messageId: z.string(),
  type: z.enum(['upvote', 'downvote']),
});

const ChatVoteResponseSchema = z.object({
  success: z.boolean(),
});

const ChatDeleteResponseSchema = z.object({
  message: z.string(),
});

const StreamingResponseSchema = z.object({
  statusText: z.string(),
  headers: z.record(z.string()),
  execute: z.function()
    .args(z.custom<DataStreamWriter>())
    .returns(z.promise(z.void()))
});

function generateUUID() {
  const array = new Uint8Array(16);
  globalThis.crypto.getRandomValues(array);
  
  array[6] = (array[6] & 0x0f) | 0x40;
  array[8] = (array[8] & 0x3f) | 0x80;
  
  const hex = Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      createTarotResponse(undefined, createTarotError(StatusCodes.UNAUTHORIZED)),
      { status: StatusCodes.UNAUTHORIZED }
    );
  }

  try {
    const chats = await getChatsByUserId({ id: session.user.id });
    const validatedChats = ChatListResponseSchema.parse(chats);
    return NextResponse.json(createTarotResponse(validatedChats));
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Chat validation error:', error);
      throw new TarotAPIError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "The cosmic forces have misaligned the chat patterns"
      );
    }
    throw new TarotAPIError(StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth().catch((error) => {
      console.error('Auth error:', error);
      return null;
    });
    
    const body = await request.json();
    const { messages, chatId, userId: requestUserId, spread } = ChatRequestSchema.parse(body);

    const latestMessage = messages[messages.length - 1].content;

    const cookieStore = await cookies();
    const sessionId = cookieStore.get('anonymous_session')?.value;

    let anonymousUserId: string | undefined;
    if (!session?.user) {
      const anonUser = await getOrCreateAnonymousUser(sessionId || crypto.randomUUID());
      anonymousUserId = anonUser.id;
    }

    const existingChat = await getChatById({ id: chatId }).catch((error) => {
      console.error('Error getting chat:', error);
      return null;
    });

    if (!existingChat) {
      try {
        const title = await generateTitleFromUserMessage({ 
          message: { role: 'user', content: latestMessage } 
        });
        await saveChat({ 
          id: chatId, 
          userId: session?.user?.id,
          anonymousUserId,
          title 
        });
      } catch (error) {
        console.error('Error creating chat:', error);
        throw new TarotAPIError(StatusCodes.INTERNAL_SERVER_ERROR);
      }
    }

    const userPersona = session?.user?.id 
      ? await personaManager.getPersona(session.user.id)
      : await personaManager.getPersona('anonymous', sessionId);

    let selectedCards;
    if (spread) {
      selectedCards = await drawPersonalizedCards(spread.positions.length, userPersona);
    }

    const aiMessages = messages.map(m => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content
    }));

    if (spread && selectedCards) {
      aiMessages.unshift({
        role: 'system',
        content: JSON.stringify({
          type: 'cards',
          cards: selectedCards,
          spread
        })
      });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4-0125-preview',
      messages: aiMessages,
      temperature: 0.7,
      stream: true,
    });

    return createDataStreamResponse({
      statusText: 'OK',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      execute: async (writer: DataStreamWriter) => {
        for await (const chunk of response) {
          const text = chunk.choices[0]?.delta?.content;
          if (text) {
            writer.write(text);
          }
        }
      }
    });

  } catch (error) {
    console.error('Chat error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createTarotResponse(undefined, createTarotError(StatusCodes.BAD_REQUEST, "The cards cannot interpret your request's pattern")),
        { status: StatusCodes.BAD_REQUEST }
      );
    }
    if (error instanceof TarotAPIError) {
      return NextResponse.json(error.toResponse(), { status: error.statusCode });
    }
    return NextResponse.json(
      createTarotResponse(undefined, createTarotError(StatusCodes.INTERNAL_SERVER_ERROR)),
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      createTarotResponse(undefined, createTarotError(StatusCodes.UNAUTHORIZED)),
      { status: StatusCodes.UNAUTHORIZED }
    );
  }

  try {
    const body = await request.json();
    const { chatId, messageId, type } = ChatVoteRequestSchema.parse(body);

    await personaManager.updateThemeWeight(
      session.user.id,
      chatId,
      type === 'upvote' ? 1 : -1
    );

    const response = ChatVoteResponseSchema.parse({ success: true });
    return NextResponse.json(createTarotResponse(response));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createTarotResponse(undefined, createTarotError(StatusCodes.BAD_REQUEST, "The cosmic forces cannot interpret your vote")),
        { status: StatusCodes.BAD_REQUEST }
      );
    }
    throw new TarotAPIError(StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    throw new TarotAPIError(
      StatusCodes.BAD_REQUEST,
      "The cards cannot find what you seek to remove"
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    throw new TarotAPIError(StatusCodes.UNAUTHORIZED);
  }

  try {
    const chat = await getChatById({ id });
    if (!chat) {
      throw new TarotAPIError(StatusCodes.NOT_FOUND);
    }

    if (chat.userId !== session.user.id) {
      throw new TarotAPIError(StatusCodes.FORBIDDEN);
    }

    await deleteChatById({ id });
    
    const response = ChatDeleteResponseSchema.parse({
      message: "The cards have faded into the mists of time"
    });
    return NextResponse.json(createTarotResponse(response));
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new TarotAPIError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "The cosmic forces have misaligned while removing your chat"
      );
    }
    if (error instanceof TarotAPIError) {
      return NextResponse.json(error.toResponse(), { status: error.statusCode });
    }
    throw new TarotAPIError(StatusCodes.INTERNAL_SERVER_ERROR);
  }
}
