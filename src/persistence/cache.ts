import type { KvStore } from './kv';

export interface ExpiringCache {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, ttlMs: number): Promise<void>;
  delete(key: string): Promise<void>;
}

interface CacheRow {
  readonly value: unknown;
  readonly expiresAt: string;
}

export function createExpiringCache(
  kv: KvStore,
  options: { readonly now?: () => Date } = {},
): ExpiringCache {
  const now = options.now ?? (() => new Date());

  return {
    async get(key) {
      const row = await kv.get(cacheKey(key));

      if (!isCacheRow(row)) {
        return undefined;
      }

      if (Date.parse(row.expiresAt) <= now().getTime()) {
        await kv.delete(cacheKey(key));
        return undefined;
      }

      return row.value;
    },
    async set(key, value, ttlMs) {
      const expiresAt = new Date(now().getTime() + Math.max(0, ttlMs)).toISOString();
      await kv.set(cacheKey(key), { value, expiresAt } satisfies CacheRow);
    },
    async delete(key) {
      await kv.delete(cacheKey(key));
    },
  };
}

function cacheKey(key: string): string {
  return `cache:${key}`;
}

function isCacheRow(value: unknown): value is CacheRow {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const row = value as { value?: unknown; expiresAt?: unknown };

  return typeof row.expiresAt === 'string';
}
