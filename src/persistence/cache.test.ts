import { describe, expect, it } from 'vitest';
import { createExpiringCache } from './cache';
import { createMemoryKvStore } from './memoryKv';

describe('expiring cache', () => {
  it('returns a value before it expires and drops it afterwards', async () => {
    let now = Date.parse('2026-01-01T00:00:00.000Z');
    const cache = createExpiringCache(createMemoryKvStore(), {
      now: () => new Date(now),
    });

    await cache.set('item:archive:night', { title: 'Night' }, 1_000);
    expect(await cache.get('item:archive:night')).toEqual({ title: 'Night' });

    now += 1_001;
    expect(await cache.get('item:archive:night')).toBeUndefined();
  });
});
