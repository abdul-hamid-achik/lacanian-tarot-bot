import { auth } from '@/app/(auth)/auth';
import { getVotesByChatId, voteMessage, getOrCreateAnonymousUser } from '@/lib/db/queries';
import { StatusCodes } from 'http-status-codes';
import { createTarotError } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db/client';
import { anonymousVote } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

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
    return NextResponse.json(
      createTarotError(StatusCodes.BAD_REQUEST, "The cosmic energies require a conversation to resonate with"),
      { status: StatusCodes.BAD_REQUEST }
    );
  }

  // Get votes regardless of authentication
  try {
    const votes = await getVotesByChatId({ id: chatId });
    return NextResponse.json(votes);
  } catch (error) {
    console.error('Error fetching votes:', error);
    return NextResponse.json(
      createTarotError(StatusCodes.INTERNAL_SERVER_ERROR, "The cosmic forces are temporarily misaligned"),
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const {
      chatId,
      messageId,
      type,
    }: { chatId: string; messageId: string; type: 'up' | 'down' } =
      await request.json();

    if (!chatId || !messageId || !type) {
      return NextResponse.json(
        createTarotError(StatusCodes.BAD_REQUEST, "The celestial alignment requires all elements to be present"),
        { status: StatusCodes.BAD_REQUEST }
      );
    }

    const session = await auth().catch(() => null);

    if (session?.user?.id) {
      // Handle authenticated user vote
      await voteMessage({
        userId: session.user.id,
        chatId,
        messageId,
        type: type,
      });
      return NextResponse.json({ message: "Your spiritual resonance has been recorded" });
    }

    // Handle anonymous user vote
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('anonymous_session')?.value;
    const response = NextResponse.json({ message: "Your spiritual resonance has been recorded" });
    
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
    console.error('Error processing vote:', error);
    return NextResponse.json(
      createTarotError(StatusCodes.INTERNAL_SERVER_ERROR, "The cosmic forces are temporarily misaligned"),
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
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
    throw error;
  }
}
