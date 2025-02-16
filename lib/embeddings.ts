import { openai } from '@ai-sdk/openai';

export class TextEmbedder {
    private model = 'text-embedding-3-small';

    async embed(text: string): Promise<number[]> {
        const response = await openai.textEmbeddingModel(this.model).doEmbed({
            values: [text]
        });
        return response.embeddings[0];
    }

    async batchEmbed(texts: string[]): Promise<number[][]> {
        // OpenAI has a limit of 2048 inputs per request
        const batchSize = 2048;
        const batches: number[][] = [];

        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            const response = await openai.textEmbeddingModel(this.model).doEmbed({
                values: batch
            });
            batches.push(...response.embeddings);
        }

        return batches;
    }
}
