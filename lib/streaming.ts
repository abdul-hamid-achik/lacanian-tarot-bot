export interface DataStreamExecutor {
    execute: (dataStream: WritableStream) => Promise<any>;
}

export function createDataStreamResponse({ execute }: DataStreamExecutor) {
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    execute(stream.writable).catch((error) => {
        console.error('Stream execution error:', error);
        writer.close();
    });

    return new Response(stream.readable);
}
