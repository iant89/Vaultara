import { describe, expect, it } from 'vitest';
import {
  MAX_RECENT_SEARCHES,
  recordRecentSearch,
  readRecentSearches,
  RECENT_SEARCH_STORAGE_KEY,
} from './recentSearches';

function memoryStore(initial: Record<string, string> = {}) {
  const values = { ...initial };

  return {
    getItem(key: string) {
      return values[key] ?? null;
    },
    setItem(key: string, value: string) {
      values[key] = value;
    },
    snapshot() {
      return values;
    },
  };
}

describe('recent searches', () => {
  it('ignores blank queries and moves a repeat to the front', () => {
    const storage = memoryStore();

    expect(recordRecentSearch('   ', storage)).toEqual([]);
    recordRecentSearch('vampire', storage);
    recordRecentSearch('silent film', storage);
    recordRecentSearch('vampire', storage);

    expect(readRecentSearches(storage)).toEqual(['vampire', 'silent film']);
  });

  it('caps the list and survives corrupt storage', () => {
    const storage = memoryStore();

    for (let index = 0; index < MAX_RECENT_SEARCHES + 3; index += 1) {
      recordRecentSearch(`query-${String(index)}`, storage);
    }

    expect(readRecentSearches(storage)).toHaveLength(MAX_RECENT_SEARCHES);
    expect(readRecentSearches(storage)[0]).toBe(`query-${String(MAX_RECENT_SEARCHES + 2)}`);

    storage.setItem(RECENT_SEARCH_STORAGE_KEY, '{not json');
    expect(readRecentSearches(storage)).toEqual([]);
  });
});
