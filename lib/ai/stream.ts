import { openai } from '@ai-sdk/openai';
import type { LanguageModelV1StreamPart } from 'ai';

export interface StreamTextOptions {
    model: string;
    messages: Array<{ role: string; content: string; name?: string }>;
    stream?: WritableStream;
    temperature?: number;
    maxTokens?: number;
}

export async function streamText({
    model,
    messages,
    stream,
    temperature = 0.7,
    maxTokens = 1000
}: StreamTextOptions) {
    const chatModel = openai.chat(model);
    const response = await chatModel.doStream({
        inputFormat: "messages",
        mode: { type: "regular" },
        temperature,
        maxTokens,
        prompt: messages.map(msg => {
            const role = msg.role as "user" | "assistant" | "system";
            if (role === "user") {
                return {
                    role,
                    content: [{ type: "text", text: msg.content }],
                    ...(msg.name ? { name: msg.name } : {})
                };
            } else if (role === "assistant") {
                return {
                    role,
                    content: [{ type: "text", text: msg.content }],
                    ...(msg.name ? { name: msg.name } : {})
                };
            } else {
                return {
                    role,
                    content: msg.content,
                    ...(msg.name ? { name: msg.name } : {})
                };
            }
        })
    });

    const encoder = new TextEncoder();
    const reader = response.stream.getReader();

    if (stream) {
        const writer = stream.getWriter();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value.type === "text-delta") {
                    await writer.write(encoder.encode(value.textDelta));
                }
            }
            // Only close after all chunks are written
            await writer.close();
        } catch (error) {
            console.error('Stream error:', error);
            try {
                await writer.close();
            } catch (closeError) {
                console.error('Error closing writer:', closeError);
            }
            throw error;
        } finally {
            reader.releaseLock();
        }
        return null;
    }

    // For Response return, use TransformStream
    const transformer = new TransformStream();
    const writer = transformer.writable.getWriter();

    // Process the stream and ensure it's properly written
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value.type === "text-delta") {
                await writer.write(encoder.encode(value.textDelta));
            }
        }
        // Only close after all chunks are written
        await writer.close();
    } catch (error) {
        console.error('Stream processing error:', error);
        try {
            await writer.close();
        } catch (closeError) {
            console.error('Error closing writer:', closeError);
        }
    } finally {
        reader.releaseLock();
    }

    return new Response(transformer.readable);
}
