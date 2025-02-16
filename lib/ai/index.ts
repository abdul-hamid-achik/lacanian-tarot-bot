import { type TarotCard, type Spread } from '@/lib/db/schema';
import { type Message } from '@/lib/types';
import { streamText } from './stream';

interface ModelConfig {
  model: string;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
}

interface AnalyzeConfig {
  cards: (TarotCard & { isReversed: boolean })[];
  spread?: Spread;
}

export const customModel = {
  async complete(config: ModelConfig): Promise<string> {
    const response = await streamText(config);
    if (response instanceof Response) {
      const reader = response.body?.getReader();
      if (reader) {
        let result = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            result += new TextDecoder().decode(value);
          }
          return result;
        } finally {
          reader.releaseLock();
        }
      }
    }
    throw new Error('Failed to get completion');
  },

  async analyze(config: AnalyzeConfig): Promise<string> {
    const { cards, spread } = config;
    const messages: Message[] = [
      {
        role: 'system' as const,
        content: 'You are a provocative Lacanian psychoanalyst. Analyze the cards and spread through an aggressive Lacanian lens.'
      },
      {
        role: 'user' as const,
        content: JSON.stringify({ cards, spread })
      }
    ];

    return this.complete({
      model: 'gpt-4o',
      messages
    });
  },

  async stream(config: ModelConfig): Promise<Response> {
    const response = await streamText(config);
    if (!(response instanceof Response)) {
      throw new Error('Failed to get stream response');
    }
    return response;
  }
};
