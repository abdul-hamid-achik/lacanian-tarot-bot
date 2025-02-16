import { type TarotAgentState, type TarotCard } from './types';
import { type Spread } from '@/lib/db/schema';
import { type RedisClientInterface, type RedisPipeline, isNodeRedis, isUpstashRedis } from './redis-client';
import { Redis } from '@upstash/redis';

const REDIS_KEYS = {
  STATE: 'tarot:state:',
  CARDS: 'tarot:cards:',
  SPREADS: 'tarot:spreads:',
  MEANINGS: 'tarot:meanings:',
  RECENT_READINGS: 'tarot:recent:',
  USER_PATTERNS: 'tarot:patterns:',
} as const;

const TTL = {
  STATE: 60 * 60, // 1 hour
  CARDS: 24 * 60 * 60, // 24 hours
  SPREADS: 24 * 60 * 60, // 24 hours
  MEANINGS: 24 * 60 * 60, // 24 hours
  RECENT_READINGS: 7 * 24 * 60 * 60, // 7 days
  USER_PATTERNS: 30 * 24 * 60 * 60, // 30 days
} as const;

export class RedisStateManager {
  constructor(private redis: RedisClientInterface) {}

  private getKey(prefix: keyof typeof REDIS_KEYS, id: string): string {
    return `${REDIS_KEYS[prefix]}${id}`;
  }

  private async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) return null;
    return typeof value === 'string' ? JSON.parse(value) : value;
  }

  private async set(key: string, value: unknown, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    await this.redis.set(key, serialized, ttl ? { ex: ttl } : undefined);
  }

  private async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  private getPipeline(): RedisPipeline {
    if (isUpstashRedis(this.redis)) {
      return this.redis.pipeline();
    }
    
    if (isNodeRedis(this.redis) && this.redis.multi) {
      return this.redis.multi();
    }
    
    if ('pipeline' in this.redis && this.redis.pipeline) {
      return this.redis.pipeline();
    }
    
    if ('multi' in this.redis && this.redis.multi) {
      return this.redis.multi();
    }
    
    throw new Error('Redis client does not support pipelining');
  }

  async getState(sessionId: string): Promise<TarotAgentState | null> {
    return this.get<TarotAgentState>(this.getKey('STATE', sessionId));
  }

  async setState(sessionId: string, state: TarotAgentState): Promise<void> {
    await this.set(this.getKey('STATE', sessionId), state, TTL.STATE);
  }

  async updateState(sessionId: string, updates: Partial<TarotAgentState>): Promise<void> {
    const currentState = await this.getState(sessionId);
    if (currentState) {
      await this.setState(sessionId, {
        ...currentState,
        ...updates
      });
    }
  }

  async cacheAllCards(cards: TarotCard[]): Promise<void> {
    const pipeline = this.getPipeline();

    // Cache individual cards
    for (const card of cards) {
      const key = this.getKey('CARDS', card.id);
      const value = JSON.stringify(card);
      
      if (pipeline.setEx) {
        pipeline.setEx(key, TTL.CARDS, value);
      } else {
        pipeline.set(key, value, { ex: TTL.CARDS });
      }
    }

    // Cache card list
    const allCardsKey = this.getKey('CARDS', 'all');
    const allCardsValue = JSON.stringify(cards);
    
    if (pipeline.setEx) {
      pipeline.setEx(allCardsKey, TTL.CARDS, allCardsValue);
    } else {
      pipeline.set(allCardsKey, allCardsValue, { ex: TTL.CARDS });
    }

    await pipeline.exec();
  }

  async getCachedCard(cardId: string): Promise<TarotCard | null> {
    return this.get<TarotCard>(this.getKey('CARDS', cardId));
  }

  async getAllCachedCards(): Promise<TarotCard[]> {
    const cards = await this.get<TarotCard[]>(this.getKey('CARDS', 'all'));
    return cards || [];
  }

  async cacheSpread(spread: Spread): Promise<void> {
    await this.set(this.getKey('SPREADS', spread.id), spread, TTL.SPREADS);
  }

  async cacheAllSpreads(spreads: Spread[]): Promise<void> {
    const pipeline = this.getPipeline();

    for (const spread of spreads) {
      const key = this.getKey('SPREADS', spread.id);
      const value = JSON.stringify(spread);
      
      if (pipeline.setEx) {
        pipeline.setEx(key, TTL.SPREADS, value);
      } else {
        pipeline.set(key, value, { ex: TTL.SPREADS });
      }
    }

    const allSpreadsKey = this.getKey('SPREADS', 'all');
    const allSpreadsValue = JSON.stringify(spreads);
    
    if (pipeline.setEx) {
      pipeline.setEx(allSpreadsKey, TTL.SPREADS, allSpreadsValue);
    } else {
      pipeline.set(allSpreadsKey, allSpreadsValue, { ex: TTL.SPREADS });
    }

    await pipeline.exec();
  }

  async getCachedSpread(spreadId: string): Promise<Spread | null> {
    return this.get<Spread>(this.getKey('SPREADS', spreadId));
  }

  async getAllCachedSpreads(): Promise<Spread[]> {
    const spreads = await this.get<Spread[]>(this.getKey('SPREADS', 'all'));
    return spreads || [];
  }

  async addRecentReading(userId: string, reading: {
    cards: TarotCard[];
    spread?: Spread;
    timestamp: number;
  }): Promise<void> {
    const key = this.getKey('RECENT_READINGS', userId);
    const readings = await this.get<typeof reading[]>(key) || [];
    
    readings.unshift(reading);
    
    if (readings.length > 10) {
      readings.pop();
    }

    await this.set(key, readings, TTL.RECENT_READINGS);
  }

  async getRecentReadings(userId: string): Promise<Array<{
    cards: TarotCard[];
    spread?: Spread;
    timestamp: number;
  }>> {
    const readings = await this.get<Array<{
      cards: TarotCard[];
      spread?: Spread;
      timestamp: number;
    }>>(this.getKey('RECENT_READINGS', userId));
    return readings ?? [];
  }

  async updateUserPatterns(userId: string, patterns: {
    commonCards: Record<string, number>;
    preferredSpreads: Record<string, number>;
    themes: Record<string, number>;
  }): Promise<void> {
    await this.set(
      this.getKey('USER_PATTERNS', userId),
      patterns,
      TTL.USER_PATTERNS
    );
  }

  async getUserPatterns(userId: string): Promise<{
    commonCards: Record<string, number>;
    preferredSpreads: Record<string, number>;
    themes: Record<string, number>;
  } | null> {
    return this.get(this.getKey('USER_PATTERNS', userId));
  }

  async clearState(sessionId: string): Promise<void> {
    await this.del(this.getKey('STATE', sessionId));
  }

  async clearUserData(userId: string): Promise<void> {
    const pipeline = this.getPipeline();

    pipeline.del(this.getKey('RECENT_READINGS', userId));
    pipeline.del(this.getKey('USER_PATTERNS', userId));
    
    await pipeline.exec();
  }
} 