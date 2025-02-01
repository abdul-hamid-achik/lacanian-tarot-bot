import { auth } from '@/app/(auth)/auth';
import { getSuggestionsByDocumentId } from '@/lib/db/queries';
import { StatusCodes } from 'http-status-codes';
import { createTarotError } from '@/lib/errors';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get('documentId');

  if (!documentId) {
    return NextResponse.json(
      createTarotError(StatusCodes.BAD_REQUEST, "The oracle requires a scroll to divine its suggestions"),
      { status: StatusCodes.BAD_REQUEST }
    );
  }

  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json(
      createTarotError(StatusCodes.UNAUTHORIZED),
      { status: StatusCodes.UNAUTHORIZED }
    );
  }

  try {
    const suggestions = await getSuggestionsByDocumentId({
      documentId,
    });

    const [suggestion] = suggestions;

    if (!suggestion) {
      return NextResponse.json([], { status: StatusCodes.OK });
    }

    if (suggestion.userId !== session.user.id) {
      return NextResponse.json(
        createTarotError(StatusCodes.FORBIDDEN),
        { status: StatusCodes.FORBIDDEN }
      );
    }

    return NextResponse.json(suggestions);
  } catch (error) {
    return NextResponse.json(
      createTarotError(StatusCodes.INTERNAL_SERVER_ERROR),
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
