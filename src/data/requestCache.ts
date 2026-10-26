/**
 * Client-side request cache (roadmap 5.5: "implement request caching", "avoid duplicate requests").
 *
 * Two problems it solves, both of them visible to users on a discovery page that fires several
 * requests at once:
 *
 * - **Duplicate requests.** React re-runs an effect when its dependencies change and, in
 *   development, twice on mount. Two components asking for the same page should produce one
 *   request, so an in-flight call is shared and a settled result is kept for a short time.
 * - **Re-fetching on navigation.** Returning to a collection should not spend another request on
 *   data that is seconds old.
 *
 * Failures are never cached: a rate limit or an outage must be retryable immediately. Aborts are
 * per-caller — a shared request keeps running for the other waiters, because one component
 * unmounting should not cancel another's data.
 */

import { createAppError, type AppError } from '../models/errors';

export interface RequestCacheOptions {
  /** How long a settled entry stays usable. */
  readonly ttlMs?: number;
  /** Upper bound on retained entries; the oldest is dropped first. */
  readonly maxEntries?: number;
  /** Injectable clock so expiry is testable without timers. */
  readonly now?: () => number;
}

export interface LoadOptions {
  readonly signal?: AbortSignal;
  /** Ignore any cached value and re-request. The fresh result replaces the cache entry. */
  readonly fresh?: boolean;
}

export interface RequestCache {
  load<T>(key: string, loader: () => Promise<T>, options?: LoadOptions): Promise<T>;
  clear(): void;
  /** Number of retained results. Used by tests and diagnostics. */
  size(): number;
}

interface Entry {
  readonly value: unknown;
  readonly storedAt: number;
}

export const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
export const DEFAULT_CACHE_MAX_ENTRIES = 120;

export function createRequestCache(options: RequestCacheOptions = {}): RequestCache {
  const ttlMs = options.ttlMs ?? DEFAULT_CACHE_TTL_MS;
  const maxEntries = Math.max(1, options.maxEntries ?? DEFAULT_CACHE_MAX_ENTRIES);
  const now = options.now ?? Date.now;
  const entries = new Map<string, Entry>();
  const inFlight = new Map<string, Promise<unknown>>();

  function store(key: string, value: unknown): void {
    entries.set(key, { value, storedAt: now() });

    while (entries.size > maxEntries) {
      const oldest = entries.keys().next();

      if (oldest.done === true) {
        break;
      }

      entries.delete(oldest.value);
    }
  }

  function read(key: string): Entry | undefined {
    const entry = entries.get(key);

    if (entry === undefined) {
      return undefined;
    }

    if (now() - entry.storedAt >= ttlMs) {
      entries.delete(key);

      return undefined;
    }

    return entry;
  }

  return {
    load<T>(key: string, loader: () => Promise<T>, loadOptions: LoadOptions = {}): Promise<T> {
      const fresh = loadOptions.fresh === true;

      // Cancelled before dispatch: starting a request for a caller that has already left wastes a
      // rate-limited provider's quota.
      if (loadOptions.signal?.aborted === true) {
        return Promise.reject(cancelledError());
      }

      if (!fresh) {
        const cached = read(key);

        if (cached !== undefined) {
          return Promise.resolve(cached.value as T);
        }

        const shared = inFlight.get(key);

        if (shared !== undefined) {
          return raceAbort(shared as Promise<T>, loadOptions.signal);
        }
      }

      const request = loader().then(
        (value) => {
          store(key, value);
          inFlight.delete(key);

          return value;
        },
        (error: unknown) => {
          inFlight.delete(key);
          throw error;
        },
      );

      inFlight.set(key, request);

      return raceAbort(request, loadOptions.signal);
    },

    clear(): void {
      entries.clear();
      inFlight.clear();
    },

    size(): number {
      return entries.size;
    },
  };
}

function cancelledError(): AppError {
  return createAppError('cancelled', 'The request was cancelled.');
}

/**
 * Reject for this caller if it aborts, without touching the shared request. The shared promise
 * keeps a rejection handler attached, so a caller that leaves cannot cause an unhandled rejection.
 */
function raceAbort<T>(promise: Promise<T>, signal: AbortSignal | undefined): Promise<T> {
  if (signal === undefined) {
    return promise;
  }

  if (signal.aborted) {
    return Promise.reject(cancelledError());
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => {
      reject(cancelledError());
    };

    signal.addEventListener('abort', onAbort, { once: true });

    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error as Error);
      },
    );
  });
}
