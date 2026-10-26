import { describe, expect, it } from 'vitest';
import { hashPassword, timingSafeEqual, verifyPassword } from './passwords';

describe('password hashing', () => {
  it('accepts the original password and rejects another', async () => {
    const verifier = await hashPassword('correct horse', { iterations: 10 });

    expect(verifier.hash).not.toContain('correct');
    expect(await verifyPassword('correct horse', verifier)).toBe(true);
    expect(await verifyPassword('wrong horse', verifier)).toBe(false);
  });

  it('compares hashes without leaking length mismatches as equal', () => {
    expect(timingSafeEqual('abcd', 'abce')).toBe(false);
    expect(timingSafeEqual('abcd', 'abc')).toBe(false);
    expect(timingSafeEqual('abcd', 'abcd')).toBe(true);
  });
});
