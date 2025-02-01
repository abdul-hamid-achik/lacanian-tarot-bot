import { auth } from '@/app/(auth)/auth';
import { getVotesByChatId, voteMessage } from '@/lib/db/queries';
import { StatusCodes } from 'http-status-codes';
import { createTarotError } from '@/lib/errors';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return NextResponse.json(
      createTarotError(StatusCodes.BAD_REQUEST, "The cosmic energies require a conversation to resonate with"),
      { status: StatusCodes.BAD_REQUEST }
    );
  }

  const session = await auth();

  if (!session || !session.user || !session.user.email) {
    return NextResponse.json(
      createTarotError(StatusCodes.UNAUTHORIZED),
      { status: StatusCodes.UNAUTHORIZED }
    );
  }

  try {
    const votes = await getVotesByChatId({ id: chatId });
    return NextResponse.json(votes);
  } catch (error) {
    return NextResponse.json(
      createTarotError(StatusCodes.INTERNAL_SERVER_ERROR),
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function PATCH(request: Request) {
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

  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json(
      createTarotError(StatusCodes.UNAUTHORIZED),
      { status: StatusCodes.UNAUTHORIZED }
    );
  }

  try {
    await voteMessage({
      userId: session.user.id,
      chatId,
      messageId,
      type: type,
    });

    return NextResponse.json({ message: "Your spiritual resonance has been recorded" });
  } catch (error) {
    return NextResponse.json(
      createTarotError(StatusCodes.INTERNAL_SERVER_ERROR),
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
