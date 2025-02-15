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
import { createTarotError } from '@/lib/errors';
import { cookies } from 'next/headers';
import { streamText } from 'ai';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const personaManager = new PersonaManager();
const cardSelector = new PersonalizedCardSelector();

interface SpreadPosition {
  name: string;
  description: string;
  themeMultiplier: number;
  position: number;
}

interface SpreadWithPositions extends Spread {
  positions: SpreadPosition[];
}

// Example: new function for drawing tarot
// (you need a real DB query to fetch random cards)
async function drawRandomTarotCards(numCards: number) {
  return await db.select().from(cardReading).orderBy(sql`random()`).limit(numCards);
}

// Enhanced intent detection for different tarot actions
function detectTarotIntent(message: string): {
  type: 'spread' | 'reading' | 'none';
  spreadId?: string;
} {
  const msg = message.toLowerCase();

  // Check for spread selection
  const spreadMatch = msg.match(/use spread (\w+)/);
  if (spreadMatch) {
    return { type: 'spread', spreadId: spreadMatch[1] };
  }

  // Check for general reading request
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

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  name: string;
}

// Helper function to generate UUID using Web Crypto API
function generateUUID() {
  const array = new Uint8Array(16);
  globalThis.crypto.getRandomValues(array);
  
  // Set version (4) and variant (2) bits
  array[6] = (array[6] & 0x0f) | 0x40;
  array[8] = (array[8] & 0x3f) | 0x80;
  
  // Convert to hex string with proper UUID format
  const hex = Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      createTarotError(StatusCodes.UNAUTHORIZED),
      { status: StatusCodes.UNAUTHORIZED }
    );
  }

  const chats = await getChatsByUserId({ id: session.user.id });
  return NextResponse.json(chats);
}

export async function POST(request: Request) {
  try {
    const session = await auth().catch((error) => {
      console.error('Auth error:', error);
      return null;
    });
    
    const { messages, chatId, userId: requestUserId, spread }: { 
      messages: { role: string; content: string }[]; 
      chatId: string;
      userId?: string;
      spread?: SpreadWithPositions;
    } = await request.json();

    const latestMessage = messages[messages.length - 1].content;

    // Get cookie for anonymous session
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('anonymous_session')?.value;

    // Get or create anonymous user if no authenticated session
    let anonymousUserId: string | undefined;
    if (!session?.user) {
      const anonUser = await getOrCreateAnonymousUser(sessionId || crypto.randomUUID());
      anonymousUserId = anonUser.id;
    }

    // Get or create chat
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
        throw error;
      }
    }

    // Get user persona
    const userPersona = session?.user?.id 
      ? await personaManager.getPersona(session.user.id)
      : await personaManager.getPersona('anonymous', sessionId);

    // If spread is provided, draw cards
    let selectedCards;
    if (spread) {
      selectedCards = await drawPersonalizedCards(spread.positions.length, userPersona);
    }

    // Format the message for the AI
    const aiMessages = messages.map(m => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content
    }));

    // Add system message with tarot context if needed
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

    // Create stream
    const response = await openai.chat.completions.create({
      model: customModel('gpt-4-turbo-preview'),
      messages: aiMessages,
      temperature: 0.7,
      stream: true
    });

    // Use Vercel's AI SDK to handle streaming
    const stream = streamText(response);
    return stream.toDataStreamResponse();

  } catch (error) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify(createTarotError(StatusCodes.INTERNAL_SERVER_ERROR)),
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      createTarotError(StatusCodes.UNAUTHORIZED),
      { status: StatusCodes.UNAUTHORIZED }
    );
  }

  const { chatId, messageId, type } = await request.json();

  // Update theme weights based on feedback
  await personaManager.updateThemeWeight(
    session.user.id,
    chatId,
    type === 'upvote' ? 1 : -1
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      createTarotError(StatusCodes.BAD_REQUEST, "The cards cannot find what you seek to remove"),
      { status: StatusCodes.BAD_REQUEST }
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      createTarotError(StatusCodes.UNAUTHORIZED),
      { status: StatusCodes.UNAUTHORIZED }
    );
  }

  try {
    const chat = await getChatById({ id });
    if (!chat) {
      return NextResponse.json(
        createTarotError(StatusCodes.NOT_FOUND),
        { status: StatusCodes.NOT_FOUND }
      );
    }

    if (chat.userId !== session.user.id) {
      return NextResponse.json(
        createTarotError(StatusCodes.FORBIDDEN),
        { status: StatusCodes.FORBIDDEN }
      );
    }

    await deleteChatById({ id });
    return NextResponse.json({ message: "The cards have faded into the mists of time" });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json(
      createTarotError(StatusCodes.INTERNAL_SERVER_ERROR),
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
