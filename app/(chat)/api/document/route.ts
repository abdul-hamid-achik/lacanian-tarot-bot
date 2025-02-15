import { auth } from '@/app/(auth)/auth';
import type { BlockKind } from '@/components/block';
import {
  deleteDocumentsByIdAfterTimestamp,
  getDocumentsById,
  saveDocument,
} from '@/lib/db/queries';
import { StatusCodes } from 'http-status-codes';
import { createTarotError } from '@/lib/errors';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      createTarotError(StatusCodes.BAD_REQUEST, "The cards cannot divine your request without proper guidance"),
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

  const documents = await getDocumentsById({ id });
  const [document] = documents;

  if (!document) {
    return NextResponse.json(
      createTarotError(StatusCodes.NOT_FOUND),
      { status: StatusCodes.NOT_FOUND }
    );
  }

  if (document.userId !== session.user.id) {
    return NextResponse.json(
      createTarotError(StatusCodes.FORBIDDEN),
      { status: StatusCodes.FORBIDDEN }
    );
  }

  return NextResponse.json(documents);
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      createTarotError(StatusCodes.BAD_REQUEST, "The mystical scroll requires an identifier"),
      { status: StatusCodes.BAD_REQUEST }
    );
  }

  const session = await auth();

  if (!session) {
    return NextResponse.json(
      createTarotError(StatusCodes.UNAUTHORIZED),
      { status: StatusCodes.UNAUTHORIZED }
    );
  }

  const {
    content,
    title,
    kind,
  }: { content: string; title: string; kind: BlockKind } = await request.json();

  if (session.user?.id) {
    try {
      const document = await saveDocument({
        content,
        title,
        kind,
        userId: session.user.id,
      });

      return NextResponse.json(document);
    } catch (error) {
      return NextResponse.json(
        createTarotError(StatusCodes.INTERNAL_SERVER_ERROR),
        { status: StatusCodes.INTERNAL_SERVER_ERROR }
      );
    }
  }

  return NextResponse.json(
    createTarotError(StatusCodes.UNAUTHORIZED),
    { status: StatusCodes.UNAUTHORIZED }
  );
}

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  const { timestamp }: { timestamp: string } = await request.json();

  if (!id) {
    return NextResponse.json(
      createTarotError(StatusCodes.BAD_REQUEST, "The mystical scroll requires an identifier"),
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
    const documents = await getDocumentsById({ id });
    const [document] = documents;

    if (!document) {
      return NextResponse.json(
        createTarotError(StatusCodes.NOT_FOUND),
        { status: StatusCodes.NOT_FOUND }
      );
    }

    if (document.userId !== session.user.id) {
      return NextResponse.json(
        createTarotError(StatusCodes.FORBIDDEN),
        { status: StatusCodes.FORBIDDEN }
      );
    }

    await deleteDocumentsByIdAfterTimestamp({
      id,
      timestamp: new Date(timestamp),
    });

    return NextResponse.json({ message: "The sands of time have swept away the requested scrolls" });
  } catch (error) {
    return NextResponse.json(
      createTarotError(StatusCodes.INTERNAL_SERVER_ERROR),
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
