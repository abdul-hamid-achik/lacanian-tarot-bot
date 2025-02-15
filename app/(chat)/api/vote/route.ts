import { auth } from '@/app/(auth)/auth';
import { getVotesByChatId, voteMessage, getOrCreateAnonymousUser } from '@/lib/db/queries';
import { StatusCodes } from 'http-status-codes';
import { createTarotResponse, createTarotError, TarotAPIError } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db/client';
import { anonymousVote } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const VoteSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  anonymousUserId: z.string().optional(),
  chatId: z.string(),
  messageId: z.string(),
  isUpvoted: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const VoteListSchema = z.array(VoteSchema);

const VoteRequestSchema = z.object({
  chatId: z.string(),
  messageId: z.string(),
  type: z.enum(['up', 'down']),
});

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
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    throw new TarotAPIError(
      StatusCodes.BAD_REQUEST,
      "The cosmic energies require a conversation to resonate with"
    );
  }

  // Get votes regardless of authentication
  try {
    const votes = await getVotesByChatId({ id: chatId });
    const validatedVotes = VoteListSchema.parse(votes);
    return NextResponse.json(createTarotResponse(validatedVotes));
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Vote validation error:', error);
      throw new TarotAPIError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "The mystical patterns of the votes are misaligned"
      );
    }
    throw new TarotAPIError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "The cosmic forces are temporarily misaligned"
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { chatId, messageId, type } = VoteRequestSchema.parse(body);

    const session = await auth().catch(() => null);

    if (session?.user?.id) {
      // Handle authenticated user vote
      await voteMessage({
        userId: session.user.id,
        chatId,
        messageId,
        type: type,
      });
      return NextResponse.json(createTarotResponse({
        message: "Your spiritual resonance has been recorded"
      }));
    }

    // Handle anonymous user vote
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('anonymous_session')?.value;
    const response = NextResponse.json(createTarotResponse({
      message: "Your spiritual resonance has been recorded"
    }));
    
    if (!sessionId) {
      const newSessionId = generateUUID();
      response.cookies.set('anonymous_session', newSessionId, { 
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });
      
      const anonymousUser = await getOrCreateAnonymousUser(newSessionId);
      await saveAnonymousVote(anonymousUser.id, chatId, messageId, type === 'up');
      return response;
    }

    const anonymousUser = await getOrCreateAnonymousUser(sessionId);
    await saveAnonymousVote(anonymousUser.id, chatId, messageId, type === 'up');
    return response;

  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new TarotAPIError(
        StatusCodes.BAD_REQUEST,
        "The celestial alignment requires all elements to be present"
      );
    }
    if (error instanceof TarotAPIError) {
      return NextResponse.json(error.toResponse(), { status: error.statusCode });
    }
    throw new TarotAPIError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "The cosmic forces are temporarily misaligned"
    );
  }
}

async function saveAnonymousVote(
  anonymousUserId: string,
  chatId: string,
  messageId: string,
  isUpvoted: boolean
) {
  try {
    // Check for existing vote
    const existingVotes = await db
      .select()
      .from(anonymousVote)
      .where(
        and(
          eq(anonymousVote.anonymousUserId, anonymousUserId),
          eq(anonymousVote.chatId, chatId),
          eq(anonymousVote.messageId, messageId)
        )
      );

    if (existingVotes.length > 0) {
      // Update existing vote
      await db
        .update(anonymousVote)
        .set({ isUpvoted })
        .where(
          and(
            eq(anonymousVote.anonymousUserId, anonymousUserId),
            eq(anonymousVote.chatId, chatId),
            eq(anonymousVote.messageId, messageId)
          )
        );
    } else {
      // Create new vote
      await db.insert(anonymousVote).values({
        anonymousUserId,
        chatId,
        messageId,
        isUpvoted,
      });
    }
  } catch (error) {
    console.error('Error saving anonymous vote:', error);
    throw new TarotAPIError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "The cosmic forces could not record your spiritual resonance"
    );
  }
}
