import { describe, expect, it, vi } from 'vitest';
import { createRequestCache } from './requestCache';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

describe('request cache', () => {
  it('serves a repeated request from the cache', async () => {
    const cache = createRequestCache();
    const loader = vi.fn(() => Promise.resolve('value'));

    await expect(cache.load('key', loader)).resolves.toBe('value');
    await expect(cache.load('key', loader)).resolves.toBe('value');

    expect(loader).toHaveBeenCalledTimes(1);
    expect(cache.size()).toBe(1);
  });

  it('shares one request between concurrent callers', async () => {
    const cache = createRequestCache();
    const pending = deferred<string>();
    const loader = vi.fn(() => pending.promise);

    const first = cache.load('key', loader);
    const second = cache.load('key', loader);

    pending.resolve('shared');

    await expect(first).resolves.toBe('shared');
    await expect(second).resolves.toBe('shared');
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('expires entries once the ttl has passed', async () => {
    let now = 1_000;
    const cache = createRequestCache({ ttlMs: 100, now: () => now });
    const loader = vi.fn(() => Promise.resolve('value'));

    await cache.load('key', loader);
    now = 1_050;
    await cache.load('key', loader);
    expect(loader).toHaveBeenCalledTimes(1);

    now = 1_100;
    await cache.load('key', loader);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('never caches a failure, so a retry actually retries', async () => {
    const cache = createRequestCache();
    const loader = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce('recovered');

    await expect(cache.load('key', loader)).rejects.toThrow('down');
    await expect(cache.load('key', loader)).resolves.toBe('recovered');
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('re-requests when the caller asks for fresh data and replaces the entry', async () => {
    const cache = createRequestCache();
    const loader = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second');

    await cache.load('key', loader);
    await expect(cache.load('key', loader, { fresh: true })).resolves.toBe('second');
    await expect(cache.load('key', loader)).resolves.toBe('second');
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('cancels one caller without cancelling the shared request', async () => {
    const cache = createRequestCache();
    const pending = deferred<string>();
    const loader = vi.fn(() => pending.promise);
    const controller = new AbortController();

    const leaving = cache.load('key', loader, { signal: controller.signal });
    const staying = cache.load('key', loader);

    controller.abort();

    await expect(leaving).rejects.toMatchObject({ kind: 'cancelled' });

    pending.resolve('still here');

    await expect(staying).resolves.toBe('still here');
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('does not start a request for an already-cancelled caller', async () => {
    const cache = createRequestCache();
    const loader = vi.fn(() => Promise.resolve('value'));
    const controller = new AbortController();
    controller.abort();

    await expect(cache.load('key', loader, { signal: controller.signal })).rejects.toMatchObject({
      kind: 'cancelled',
    });
    expect(loader).not.toHaveBeenCalled();
  });

  it('keeps the number of retained entries bounded', async () => {
    const cache = createRequestCache({ maxEntries: 2 });

    await cache.load('a', () => Promise.resolve(1));
    await cache.load('b', () => Promise.resolve(2));
    await cache.load('c', () => Promise.resolve(3));

    expect(cache.size()).toBe(2);
  });

  it('drops everything on clear', async () => {
    const cache = createRequestCache();

    await cache.load('key', () => Promise.resolve('value'));
    cache.clear();

    expect(cache.size()).toBe(0);
  });
});
