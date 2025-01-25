import OpenAI from 'openai';
import { createParser, ParserCallbacks } from 'eventsource-parser';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export interface StreamTextOptions {
    model: string;
    messages: Array<{ role: any; content: string, name: string }>;
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
    const response = await openai.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const readableStream = new ReadableStream({
        async start(controller) {
            const onParse = (event: any) => {
                if (event.type === 'event') {
                    try {
                        const data = JSON.parse(event.data);
                        const text = data.choices[0]?.delta?.content || '';
                        if (text) {
                            controller.enqueue(encoder.encode(text));
                        }
                    } catch (e) {
                        controller.error(e);
                    }
                }
            };

            const parser = createParser(onParse as ParserCallbacks);

            for await (const chunk of response) {
                const json = chunk.choices[0]?.delta?.content || '';
                parser.feed(decoder.decode(encoder.encode(json)));
            }

            controller.close();
        },
    });

    if (stream) {
        const writer = stream.getWriter();
        const reader = readableStream.getReader();

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                await writer.write(value);
            }
        } finally {
            reader.releaseLock();
            writer.releaseLock();
        }

        return null;
    }

    return new Response(readableStream);
}
