import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export class TextEmbedder {
    private model = 'text-embedding-3-small';

    async embed(text: string): Promise<number[]> {
        const response = await openai.embeddings.create({
            model: this.model,
            input: text
        });
        return response.data[0].embedding;
    }

    async batchEmbed(texts: string[]): Promise<number[][]> {
        // OpenAI has a limit of 2048 inputs per request
        const batchSize = 2048;
        const batches: number[][] = [];

        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            const response = await openai.embeddings.create({
                model: this.model,
                input: batch
            });
            batches.push(...response.data.map((d: { embedding: number[] }) => d.embedding));
        }

        return batches;
    }
}
