export interface DataStreamExecutor {
    execute: (dataStream: WritableStream) => Promise<any>;
}

export function createDataStreamResponse({ execute }: DataStreamExecutor) {
    const stream = new TransformStream();
    
    // Execute and ensure proper error handling
    (async () => {
        try {
            await execute(stream.writable);
        } catch (error) {
            console.error('Stream execution error:', error);
            // Don't close the stream here, let the execute function handle it
        }
    })();

    return new Response(stream.readable);
}
