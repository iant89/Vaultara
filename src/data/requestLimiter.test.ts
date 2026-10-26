import { describe, expect, it, vi } from 'vitest';
import { createRequestLimiter } from './requestLimiter';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

describe('request limiter', () => {
  it('keeps only the configured number of requests in flight', async () => {
    const limiter = createRequestLimiter(2);
    const first = deferred<string>();
    const second = deferred<string>();
    let started = 0;

    const tasks = [first, second].map((pending) =>
      limiter.run(() => {
        started += 1;

        return pending.promise;
      }),
    );
    const queued = limiter.run(() => {
      started += 1;

      return Promise.resolve('third');
    });

    expect(started).toBe(2);
    expect(limiter.pending()).toBe(3);

    first.resolve('first');
    await expect(tasks[0]).resolves.toBe('first');

    // The queued task starts as soon as a slot frees up.
    await expect(queued).resolves.toBe('third');
    expect(started).toBe(3);

    second.resolve('second');
    await expect(tasks[1]).resolves.toBe('second');
    expect(limiter.pending()).toBe(0);
  });

  it('starts queued tasks in the order they arrived', async () => {
    const limiter = createRequestLimiter(1);
    const blocker = deferred<void>();
    const order: string[] = [];

    const first = limiter.run(async () => {
      await blocker.promise;
      order.push('first');
    });
    const second = limiter.run(() => {
      order.push('second');

      return Promise.resolve();
    });
    const third = limiter.run(() => {
      order.push('third');

      return Promise.resolve();
    });

    blocker.resolve();
    await Promise.all([first, second, third]);

    expect(order).toEqual(['first', 'second', 'third']);
  });

  it('releases the slot when a task fails', async () => {
    const limiter = createRequestLimiter(1);
    const failing = vi.fn(() => Promise.reject(new Error('down')));

    await expect(limiter.run(failing)).rejects.toThrow('down');
    await expect(limiter.run(() => Promise.resolve('next'))).resolves.toBe('next');
    expect(limiter.pending()).toBe(0);
  });

  it('runs everything when the limit is at least the number of tasks', async () => {
    const limiter = createRequestLimiter(10);

    const results = await Promise.all(
      [1, 2, 3].map((value) => limiter.run(() => Promise.resolve(value))),
    );

    expect(results).toEqual([1, 2, 3]);
  });
});
