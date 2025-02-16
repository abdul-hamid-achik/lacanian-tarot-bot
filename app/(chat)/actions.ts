'use server';

import { createDataStreamResponse, type CoreUserMessage, type DataStreamWriter } from 'ai';
import { cookies } from 'next/headers';
import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
} from '@/lib/db/queries';
import type { VisibilityType } from '@/components/visibility-selector';

export async function saveModelId(model: string) {
  const cookieStore = await cookies();
  cookieStore.set('model-id', model);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: CoreUserMessage;
}) {
  return createDataStreamResponse({
    statusText: 'OK',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    execute: async (writer: DataStreamWriter) => {
      const systemPrompt = `
        - you will generate a short title based on the first message a user begins a conversation with
        - ensure it is not more than 80 characters long
        - the title should be a summary of the user's message
        - do not use quotes or colons
      `;

      // Write system message
      await writer.write(`2:${systemPrompt}\n`);
      
      // Write user message
      await writer.write(`2:${JSON.stringify(message)}\n`);
      
      // Write done signal
      await writer.write('0:done\n');
    }
  });
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await updateChatVisiblityById({ chatId, visibility });
}
