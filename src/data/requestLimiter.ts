/**
 * Outbound request limiter.
 *
 * A discovery page asks for several rows at once. The Internet Archive rate-limits by client, so
 * firing every request in the same tick is the fastest way to be told to slow down. This queue
 * keeps a small, predictable number of requests in flight and hands the rest to the next slot as
 * they finish — cheap politeness that the reliability layer cannot provide, because it sees one
 * call at a time.
 */

export interface RequestLimiter {
  run<T>(task: () => Promise<T>): Promise<T>;
  /** Requests currently running plus waiting. Used by tests and diagnostics. */
  pending(): number;
}

export const DEFAULT_MAX_CONCURRENT_REQUESTS = 4;

export function createRequestLimiter(
  maxConcurrent: number = DEFAULT_MAX_CONCURRENT_REQUESTS,
): RequestLimiter {
  const limit = Math.max(1, Math.trunc(maxConcurrent));
  const queue: (() => void)[] = [];
  let active = 0;

  function release(): void {
    active -= 1;
    const next = queue.shift();

    if (next !== undefined) {
      next();
    }
  }

  return {
    async run<T>(task: () => Promise<T>): Promise<T> {
      if (active >= limit) {
        await new Promise<void>((resolve) => {
          queue.push(resolve);
        });
      }

      active += 1;

      try {
        return await task();
      } finally {
        release();
      }
    },

    pending(): number {
      return active + queue.length;
    },
  };
}
