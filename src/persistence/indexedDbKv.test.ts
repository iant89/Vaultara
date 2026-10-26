import { describe, expect, it } from 'vitest';
import { isPersistenceError } from './errors';
import { createIndexedDbKvStore } from './indexedDbKv';

describe('IndexedDB key-value store', () => {
  it('fails clearly when IndexedDB is missing', async () => {
    if (typeof indexedDB !== 'undefined') {
      return;
    }

    try {
      await createIndexedDbKvStore({ databaseName: 'vaultara-test-missing' }).get('anything');
      expect.unreachable();
    } catch (error) {
      expect(isPersistenceError(error) && error.code).toBe('unavailable');
    }
  });
});
