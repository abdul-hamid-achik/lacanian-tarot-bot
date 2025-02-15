import type { InferSelectModel } from 'drizzle-orm';
import type { spread, tarotCard } from './schema';

export type Spread = InferSelectModel<typeof spread>;
export type TarotCard = InferSelectModel<typeof tarotCard>;

export interface SpreadPosition {
    name: string;
    description: string;
    themeMultiplier: number;
    position: number;
} 