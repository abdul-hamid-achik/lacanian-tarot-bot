import OpenAI from 'openai';

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

    if (stream) {
        const writer = stream.getWriter();
        try {
            for await (const chunk of response) {
                const text = chunk.choices[0]?.delta?.content;
                if (text) {
                    await writer.write(encoder.encode(text));
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
        }
        return null;
    }

    // For Response return, use TransformStream
    const transformer = new TransformStream();
    const writer = transformer.writable.getWriter();

    // Process the stream and ensure it's properly written
    try {
        for await (const chunk of response) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) {
                await writer.write(encoder.encode(text));
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
    }

    return new Response(transformer.readable);
}
