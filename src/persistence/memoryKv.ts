import type { KvStore } from './kv';

/** In-memory key-value store. Tests share one Map across "reloads" to prove persistence. */
export function createMemoryKvStore(initial?: Map<string, unknown>): KvStore {
  const data = initial ?? new Map<string, unknown>();

  return {
    async get(key) {
      return data.has(key) ? data.get(key) : undefined;
    },
    async set(key, value) {
      data.set(key, value);
    },
    async delete(key) {
      data.delete(key);
    },
    async list(prefix) {
      const matches: Array<{ key: string; value: unknown }> = [];

      for (const [key, value] of data) {
        if (key.startsWith(prefix)) {
          matches.push({ key, value });
        }
      }

      return matches;
    },
  };
}
