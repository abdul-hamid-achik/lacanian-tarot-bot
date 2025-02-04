import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { StatusCodes } from 'http-status-codes';
import { createTarotError } from '@/lib/errors';

import { auth } from '@/app/(auth)/auth';

// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: 'The mystical scroll exceeds the ethereal limits (5MB)',
    })
    // Update the file type based on the kind of files you want to accept
    .refine((file) => ['image/jpeg', 'image/png'].includes(file.type), {
      message: 'The scroll must be inscribed in the sacred formats (JPEG or PNG)',
    }),
});

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        createTarotError(StatusCodes.UNAUTHORIZED, "Only initiated seekers may offer scrolls to the cosmic archive"),
        { status: StatusCodes.UNAUTHORIZED }
      );
    }

    if (request.body === null) {
      return NextResponse.json(
        createTarotError(StatusCodes.BAD_REQUEST, "The mystical offering appears empty"),
        { status: StatusCodes.BAD_REQUEST }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as Blob;

    if (!file) {
      return NextResponse.json(
        createTarotError(StatusCodes.BAD_REQUEST, "No scroll was presented for the cosmic archive"),
        { status: StatusCodes.BAD_REQUEST }
      );
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(', ');

      return NextResponse.json(
        createTarotError(StatusCodes.BAD_REQUEST, errorMessage),
        { status: StatusCodes.BAD_REQUEST }
      );
    }

    // Get filename from formData since Blob doesn't have name property
    const filename = (formData.get('file') as File).name;
    const fileBuffer = await file.arrayBuffer();

    try {
      const data = await put(`${filename}`, fileBuffer, {
        access: 'public',
      });

      return NextResponse.json({
        message: "Your scroll has been preserved in the cosmic archive",
        ...data
      });
    } catch (error) {
      console.error('Failed to upload file:', error);
      return NextResponse.json(
        createTarotError(StatusCodes.INTERNAL_SERVER_ERROR, "The cosmic forces could not preserve your scroll"),
        { status: StatusCodes.INTERNAL_SERVER_ERROR }
      );
    }
  } catch (error) {
    // Check if it's an auth error
    if (error instanceof Error && error.message.includes('auth')) {
      console.error('Authentication error:', error);
      return NextResponse.json(
        createTarotError(StatusCodes.UNAUTHORIZED, "Your spiritual connection has been disrupted"),
        { status: StatusCodes.UNAUTHORIZED }
      );
    }

    console.error('Failed to process request:', error);
    return NextResponse.json(
      createTarotError(StatusCodes.INTERNAL_SERVER_ERROR, "The mystical energies could not process your offering"),
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
