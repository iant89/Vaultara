import { describe, expect, it } from 'vitest';
import { isPersistenceError } from './errors';
import { validateDisplayName, validateEmail, validatePassword } from './validation';

describe('account input validation', () => {
  it('normalizes email case and surrounding space', () => {
    expect(validateEmail('  Alex@Example.COM ')).toBe('alex@example.com');
  });

  it('rejects an email without a domain', () => {
    try {
      validateEmail('not-an-email');
      expect.unreachable();
    } catch (error) {
      expect(isPersistenceError(error) && error.code).toBe('validation');
    }
  });

  it('rejects a short password', () => {
    try {
      validatePassword('short');
      expect.unreachable();
    } catch (error) {
      expect(isPersistenceError(error) && error.code).toBe('validation');
    }
  });

  it('rejects a blank display name', () => {
    try {
      validateDisplayName('   ');
      expect.unreachable();
    } catch (error) {
      expect(isPersistenceError(error) && error.code).toBe('validation');
    }
  });
});
