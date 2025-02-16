import { Redis } from '@upstash/redis';
import { createClient as createVercelKV } from '@vercel/kv';
import { createClient as createRedis } from 'redis';

// Define pipeline interface
export interface RedisPipeline {
  set(key: string, value: string, options?: { ex?: number }): RedisPipeline;
  setEx?(key: string, ttl: number, value: string): RedisPipeline;
  del(key: string): RedisPipeline;
  exec(): Promise<any[]>;
}

// Define a common interface that all Redis clients must implement
export interface RedisClientInterface {
  get(key: string): Promise<any>;
  set(key: string, value: string, options?: { ex?: number }): Promise<any>;
  del(key: string): Promise<any>;
  pipeline?(): RedisPipeline;
  multi?(): RedisPipeline;
}

// Type guard to check if a client is a node-redis client
function isNodeRedis(client: any): client is any {
  return 'setEx' in client && 'multi' in client;
}

// Type guard to check if a client is an Upstash Redis client
function isUpstashRedis(client: any): client is Redis {
  return client instanceof Redis;
}

// Wrapper for node-redis client to match our interface
function wrapNodeRedis(client: any): RedisClientInterface {
  return {
    get: (key: string) => client.get(key),
    set: (key: string, value: string, options?: { ex?: number }) => {
      if (options?.ex) {
        return client.setEx(key, options.ex, value);
      }
      return client.set(key, value);
    },
    del: (key: string) => client.del(key),
    multi: () => client.multi()
  };
}

// Create a mock pipeline for Vercel KV
function createMockPipeline(redis: RedisClientInterface): RedisPipeline {
  const commands: Array<() => Promise<any>> = [];
  
  return {
    set(key: string, value: string, options?: { ex?: number }) {
      commands.push(() => redis.set(key, value, options));
      return this;
    },
    setEx(key: string, ttl: number, value: string) {
      commands.push(() => redis.set(key, value, { ex: ttl }));
      return this;
    },
    del(key: string) {
      commands.push(() => redis.del(key));
      return this;
    },
    async exec() {
      return Promise.all(commands.map(cmd => cmd()));
    }
  };
}

export async function createRedisClient(): Promise<RedisClientInterface> {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // Use Vercel KV in production
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      throw new Error('Missing Vercel KV credentials');
    }

    const client = createVercelKV({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });

    return {
      ...client,
      pipeline: () => createMockPipeline(client)
    };
  } else {
    // Use local Redis in development
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    
    // For local development, we use the redis-http proxy from docker-compose
    if (url.includes('localhost')) {
      const client = createVercelKV({
        url: `http://localhost:8079`,
        token: 'api_token', // This matches our docker-compose configuration
      });

      return {
        ...client,
        pipeline: () => createMockPipeline(client)
      };
    }

    // Fallback to direct Redis connection if needed
    const client = createRedis({
      url,
    });

    client.on('error', (error: Error) => console.error('Redis Client Error:', error));
    client.on('connect', () => console.log('Connected to Redis'));
    client.on('ready', () => console.log('Redis Client Ready'));

    await client.connect();
    return wrapNodeRedis(client);
  }
}

export { isNodeRedis, isUpstashRedis }; 