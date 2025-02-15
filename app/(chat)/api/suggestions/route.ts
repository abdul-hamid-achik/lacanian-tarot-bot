import { auth } from '@/app/(auth)/auth';
import { getSuggestionsByDocumentId } from '@/lib/db/queries';
import { StatusCodes } from 'http-status-codes';
import { createTarotResponse, createTarotError, TarotAPIError } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const SuggestionSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  userId: z.string(),
  content: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const SuggestionListSchema = z.array(SuggestionSchema);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get('documentId');

  if (!documentId) {
    throw new TarotAPIError(
      StatusCodes.BAD_REQUEST,
      "The oracle requires a scroll to divine its suggestions"
    );
  }

  const session = await auth();

  if (!session || !session.user) {
    throw new TarotAPIError(StatusCodes.UNAUTHORIZED);
  }

  try {
    const suggestions = await getSuggestionsByDocumentId({
      documentId,
    });

    const [suggestion] = suggestions;

    if (!suggestion) {
      return NextResponse.json(createTarotResponse([]));
    }

    if (suggestion.userId !== session.user.id) {
      throw new TarotAPIError(StatusCodes.FORBIDDEN);
    }

    const validatedSuggestions = SuggestionListSchema.parse(suggestions);
    return NextResponse.json(createTarotResponse(validatedSuggestions));
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Suggestion validation error:', error);
      throw new TarotAPIError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "The mystical patterns of the suggestions are misaligned"
      );
    }
    if (error instanceof TarotAPIError) {
      return NextResponse.json(error.toResponse(), { status: error.statusCode });
    }
    throw new TarotAPIError(StatusCodes.INTERNAL_SERVER_ERROR);
  }
}
