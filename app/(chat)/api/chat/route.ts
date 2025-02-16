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
import { createDataStreamResponse, type DataStreamWriter } from 'ai';
import { z } from 'zod';
import { systemPrompt, generateTarotPrompt } from '@/lib/ai/prompts';

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

const MessageSchema = z.object({
  role: z.string(),
  content: z.string(),
});

const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema).min(1),  // Ensure at least one message
  chatId: z.string(),
  userId: z.string().optional(),
  spread: z.any().optional()
});

type ChatRequest = z.infer<typeof ChatRequestSchema>;
type Message = z.infer<typeof MessageSchema>;

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
    const session = await auth();
    const user = session?.user;

    if (!user || !user.id) {
      throw new TarotAPIError(StatusCodes.UNAUTHORIZED, 'Unauthorized');
    }

    const json = await request.json();
    const validatedRequest = ChatRequestSchema.parse(json);
    const { messages } = validatedRequest;
    
    // Since we validated with .min(1) and MessageSchema requires content, we know these exist
    const lastMessage = messages[messages.length - 1];
    const content = lastMessage.content as string;
    
    // Process the tarot reading logic
    const intent = detectTarotIntent(content);

    return createDataStreamResponse({
      statusText: 'OK',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      execute: async (writer: DataStreamWriter) => {
        if (intent.type === 'spread' || intent.type === 'reading') {
          // Handle tarot reading
          const { numCards } = parseTarotRequest(content);
          const userPersona = await personaManager.getPersona(user.id);
          const cards = await drawPersonalizedCards(numCards, userPersona);
          
          // Get spread if specified
          const spread = intent.spreadId ? await getSpreadById(intent.spreadId) : null;

          // Use the centralized tarot prompt generator
          const tarotSystemPrompt = generateTarotPrompt(cards, spread);
          
          // Write system prompt
          await writer.write(`2:${tarotSystemPrompt}\n`);
          
          // Write messages
          for (const msg of messages) {
            await writer.write(`2:${JSON.stringify(msg)}\n`);
          }
        } else {
          // Handle regular chat
          // Write system prompt
          await writer.write(`2:${systemPrompt}\n`);
          
          // Write messages
          for (const msg of messages) {
            await writer.write(`2:${JSON.stringify(msg)}\n`);
          }
        }
        
        // Write done signal
        await writer.write('0:done\n');
      }
    });
    
  } catch (error) {
    if (error instanceof TarotAPIError) {
      return createTarotError(StatusCodes.UNAUTHORIZED, error.message);
    }
    if (error instanceof z.ZodError) {
      return createTarotError(
        StatusCodes.BAD_REQUEST,
        "The cosmic forces cannot interpret your message structure"
      );
    }
    console.error('Error in chat route:', error);
    return createTarotError(StatusCodes.INTERNAL_SERVER_ERROR, 'Internal Server Error');
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
