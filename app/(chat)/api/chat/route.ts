import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db/client';
import { type Spread } from '@/lib/db/schema';
import { customModel } from '@/lib/ai';
import { streamText } from '@/lib/ai/stream';
import {
  deleteChatById,
  getChatById,
  getChatsByUserId,
  saveChat,
  getOrCreateAnonymousUser,
  voteMessage
} from '@/lib/db/queries';
import { generateTitleFromUserMessage } from '../../actions';
import { getSpreadById } from '@/lib/spreads';
import { StatusCodes } from 'http-status-codes';
import { createTarotResponse, createTarotError, TarotAPIError } from '@/lib/errors';
import { cookies } from 'next/headers';
import { createDataStreamResponse, type DataStreamWriter } from 'ai';
import { z } from 'zod';
import { systemPrompt } from '@/lib/ai/prompts';
import { TarotAgent } from '@/lib/ai/agent/tarot-agent';

interface SpreadWithPositions extends Spread {
  positions: {
    name: string;
    description: string;
    themeMultiplier: number;
    position: number;
  }[];
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

const MessageSchema = z.object({
  role: z.string(),
  content: z.string(),
});

const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema).min(1),
  id: z.string().optional(),
  chatId: z.string().optional(),
  userId: z.string().optional(),
  spread: z.any().optional(),
  modelId: z.string().optional()
}).refine((data) => data.id || data.chatId, {
  message: "Either 'id' or 'chatId' must be provided"
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
    let userId = user?.id;
    
    // Handle anonymous users
    if (!userId) {
      const cookieStore = await cookies();
      const anonymousSession = cookieStore.get('anonymous_session');
      
      if (!anonymousSession?.value) {
        return NextResponse.json(
          createTarotResponse(undefined, createTarotError(StatusCodes.UNAUTHORIZED, "No session found")),
          { status: StatusCodes.UNAUTHORIZED }
        );
      }
      
      // Get or create anonymous user
      const anonymousUser = await getOrCreateAnonymousUser(anonymousSession.value);
      userId = anonymousUser.id;
    }

    const json = await request.json();
    const validatedRequest = ChatRequestSchema.parse(json);
    const { messages, id, chatId, modelId } = validatedRequest;
    const actualChatId = chatId || id;
    
    // Since we validated with .min(1) and MessageSchema requires content, we know these exist
    const lastMessage = messages[messages.length - 1];
    const content = lastMessage.content as string;
    
    // Initialize the Lacanian analyst agent
    const agent = new TarotAgent(
      actualChatId || crypto.randomUUID(),
      userId,
      !session?.user,
      {
        modelId: modelId || 'gpt-4o',
        maxCards: 3,
        streamResponses: true
      }
    );

    // Process the message based on intent
    const intent = detectTarotIntent(content);
    if (intent.type === 'spread' || intent.type === 'reading') {
      return agent.processReading(content, intent.spreadId);
    } else {
      return agent.processChat(messages);
    }
  } catch (error) {
    if (error instanceof TarotAPIError) {
      return NextResponse.json(
        createTarotResponse(undefined, createTarotError(error.statusCode, error.message)),
        { status: error.statusCode }
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createTarotResponse(undefined, createTarotError(
          StatusCodes.BAD_REQUEST,
          "The cosmic forces cannot interpret your message structure"
        )),
        { status: StatusCodes.BAD_REQUEST }
      );
    }
    console.error('Error in chat route:', error);
    return NextResponse.json(
      createTarotResponse(undefined, createTarotError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "The cosmic forces are temporarily misaligned"
      )),
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

    await voteMessage({
      userId: session.user.id,
      chatId,
      messageId,
      type: type === 'upvote' ? 'up' : 'down'
    });

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
