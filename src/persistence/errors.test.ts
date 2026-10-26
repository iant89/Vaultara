import { describe, expect, it } from 'vitest';
import { createPersistenceError, isPersistenceError, toPersistenceError } from './errors';

describe('persistence errors', () => {
  it('keeps an explicit message', () => {
    expect(createPersistenceError('validation', 'Enter a valid email address.').message).toBe(
      'Enter a valid email address.',
    );
  });

  it('recognizes its own shape', () => {
    expect(isPersistenceError(createPersistenceError('conflict', 'Taken'))).toBe(true);
    expect(isPersistenceError(new Error('Taken'))).toBe(false);
  });

  it('wraps unknown failures as unavailable', () => {
    expect(toPersistenceError(new Error('disk full'))).toMatchObject({
      code: 'unavailable',
      message: 'disk full',
    });
  });
});
