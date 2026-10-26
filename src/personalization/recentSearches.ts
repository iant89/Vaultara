/**
 * Recent search queries (design spec 15.2, 21.1).
 *
 * These are short, non-sensitive strings, so they live in localStorage rather than the
 * account store. They work without signing in and do not sync across devices.
 */

export const RECENT_SEARCH_STORAGE_KEY = 'vaultara.recent-searches';
export const MAX_RECENT_SEARCHES = 8;

export type SearchHistoryStorage = Pick<Storage, 'getItem' | 'setItem'>;

function readStore(storage: SearchHistoryStorage): readonly string[] {
  try {
    const raw = storage.getItem(RECENT_SEARCH_STORAGE_KEY);

    if (raw === null || raw.trim() === '') {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0,
    );
  } catch {
    return [];
  }
}

export function readRecentSearches(
  storage: SearchHistoryStorage = globalThis.localStorage,
): readonly string[] {
  return readStore(storage).slice(0, MAX_RECENT_SEARCHES);
}

export function recordRecentSearch(
  query: string,
  storage: SearchHistoryStorage = globalThis.localStorage,
): readonly string[] {
  const trimmed = query.trim();

  if (trimmed.length === 0) {
    return readRecentSearches(storage);
  }

  const next = [trimmed, ...readStore(storage).filter((entry) => entry !== trimmed)].slice(
    0,
    MAX_RECENT_SEARCHES,
  );

  try {
    storage.setItem(RECENT_SEARCH_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota or private-mode failures must not break search itself.
  }

  return next;
}
