import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { PersonaManager } from '@/lib/persona';
import { PersonalizedCardSelector } from '@/lib/card-selector';
import { createDataStreamResponse } from '@/lib/streaming';
import { streamText } from '@/lib/ai/stream';
import { db } from '@/lib/db/client';
import { cardReading, type Spread } from '@/lib/db/schema';
import { customModel } from '@/lib/ai';
import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import { generateUUID, getMostRecentUserMessage, sanitizeResponseMessages } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { sql } from 'drizzle-orm';
import { drawPersonalizedCards } from '@/lib/cards';
import { getPublicSpreads, getSpreadById } from '@/lib/spreads';

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
    numCards: numCardsMatch ? parseInt(numCardsMatch[1], 10) : 3,
  };
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  name: string;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { messages, id: chatId }: { messages: ChatMessage[]; id: string } = await request.json();
  const latestMessage = messages[messages.length - 1].content;

  // Detect tarot intent
  const intent = detectTarotIntent(latestMessage);
  const userPersona = await personaManager.getPersona(session.user.id);

  if (intent.type !== 'none') {
    let selectedCards;
    let spreadInfo: SpreadWithPositions | null = null;

    if (intent.type === 'spread' && intent.spreadId) {
      // Get the requested spread
      const spread = await getSpreadById(intent.spreadId);
      if (!spread) {
        return NextResponse.json(
          { error: 'Spread not found' },
          { status: 404 }
        );
      }
      spreadInfo = spread as SpreadWithPositions;
      // Draw cards for each position in the spread
      selectedCards = await drawPersonalizedCards(spreadInfo.positions.length, userPersona);
    } else {
      // Handle regular card drawing
      const { numCards } = parseTarotRequest(latestMessage);
      selectedCards = await drawPersonalizedCards(numCards, userPersona);
    }

    // Generate personalized interpretation
    return createDataStreamResponse({
      execute: async (dataStream) => {
        const systemMessage = `You are a Lacanian Tarot reader. Interpret the cards through a psychoanalytic lens.
Consider the user's themes: ${userPersona.themes.map(t => `${t.name} (weight: ${t.weight})`).join(', ')}

${spreadInfo ? `
You are using the "${spreadInfo.name}" spread:
${spreadInfo.description}

Card Positions:
${spreadInfo.positions.map((pos: SpreadPosition, i: number) => `${i + 1}. ${pos.name}: ${pos.description}`).join('\n')}
` : ''}`;

        return streamText({
          model: customModel('gpt-4o'),
          messages: [
            { role: 'system', content: systemMessage, name: 'system' },
            ...messages,
            {
              role: 'assistant',
              name: 'assistant',
              content: JSON.stringify({
                type: 'cards',
                spread: spreadInfo,
                cards: selectedCards.map((card, i) => ({
                  ...card,
                  position: spreadInfo?.positions[i]
                }))
              })
            }
          ],
          stream: dataStream,
        });
      }
    });
  }

  // Handle regular chat messages
  return createDataStreamResponse({
    execute: async (dataStream) => {
      return streamText({
        model: customModel('gpt-4'),
        messages,
        stream: dataStream,
      });
    }
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
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
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });
    if (!chat) {
      return new Response('Not Found', { status: 404 });
    }

    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });
    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return new Response('An error occurred while processing your request', {
      status: 500,
    });
  }
}
