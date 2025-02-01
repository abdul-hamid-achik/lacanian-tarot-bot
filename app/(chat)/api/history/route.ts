import { auth } from '@/app/(auth)/auth';
import { getChatsByUserId } from '@/lib/db/queries';
import { StatusCodes } from 'http-status-codes';
import { createTarotError } from '@/lib/errors';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json(
      createTarotError(StatusCodes.UNAUTHORIZED),
      { status: StatusCodes.UNAUTHORIZED }
    );
  }

  try {
    const chats = await getChatsByUserId({ id: session.user.id! });
    return NextResponse.json(chats);
  } catch (error) {
    return NextResponse.json(
      createTarotError(StatusCodes.INTERNAL_SERVER_ERROR),
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
