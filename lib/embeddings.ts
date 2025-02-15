import OpenAI from 'openai';

export class TextEmbedder {
    private openai: InstanceType<typeof OpenAI>;
    private model = 'text-embedding-3-small';

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async embed(text: string): Promise<number[]> {
        const response = await this.openai.embeddings.create({
            model: this.model,
            input: text,
            encoding_format: 'float'
        });

        return response.data[0].embedding;
    }

    async batchEmbed(texts: string[]): Promise<number[][]> {
        // OpenAI has a limit of 2048 inputs per request
        const batchSize = 2048;
        const batches = [];

        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            const response = await this.openai.embeddings.create({
                model: this.model,
                input: batch,
                encoding_format: 'float'
            });

            batches.push(...response.data.map((d: { embedding: number[] }) => d.embedding));
        }

        return batches;
    }
}
