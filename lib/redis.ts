import { Redis } from "@upstash/redis";

// Expanded Redis client interface for our use cases
interface MinimalRedisClient {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, options?: { ex?: number }) => Promise<void | null>;
  del: (...keys: string[]) => Promise<number>;
  ping: () => Promise<string>;
  keys: (pattern: string) => Promise<string[]>;
  lpush: (key: string, ...values: string[]) => Promise<number>;
  ltrim: (key: string, start: number, stop: number) => Promise<string | null>;
  zincrby: (key: string, increment: number, member: string) => Promise<string | null>;
  lrange: (key: string, start: number, stop: number) => Promise<string[]>;
  llen: (key: string) => Promise<number>;
  // Set operations
  sadd: (key: string, ...members: string[]) => Promise<number>;
  srem: (key: string, ...members: string[]) => Promise<number>;
  smembers: (key: string) => Promise<string[]>;
  // Hash operations
  hset: (key: string, field: string, value: string) => Promise<number>;
  hgetall: (key: string) => Promise<Record<string, string> | null>;
  hdel: (key: string, ...fields: string[]) => Promise<number>;
}

let redis: MinimalRedisClient | null = null;

export async function getRedis(): Promise<MinimalRedisClient> {
  if (redis) return redis;

  try {
    redis = Redis.fromEnv() as unknown as MinimalRedisClient;
    // Test connection
    await redis.ping();
    return redis;
  } catch {
    // Fallback: no-op Redis client
    redis = {
      get: async () => null,
      set: async () => null,
      del: async (...keys: string[]) => 0,
      ping: async () => "PONG",
      keys: async () => [],
      lpush: async () => 0,
      ltrim: async () => null,
      zincrby: async () => null,
      lrange: async () => [],
      llen: async () => 0,
      sadd: async () => 0,
      srem: async () => 0,
      smembers: async () => [],
      hset: async () => 0,
      hgetall: async () => null,
      hdel: async () => 0,
    };
    return redis;
  }
}

export async function getCachedBalance(userId: string): Promise<number | null> {
  try {
    const client = await getRedis();
    
    const val = await client.get(`user:credits:${userId}`);
    return val !== null ? Number(val) : null;
  } catch {
    return null;
  }
}

export async function setCachedBalance(userId: string, balance: number, ttlSeconds = 300) {
  try {
    const client = await getRedis();
    await client.set(`user:credits:${userId}`, String(balance), { ex: ttlSeconds });
  } catch {
    // ignore cache errors
  }
}

export async function invalidateBalanceCache(userId: string) {
  try {
    const client = await getRedis();
    await client.del(`user:credits:${userId}`);
  } catch {
    // ignore cache errors
  }
}
