import { describe, expect, it } from 'vitest';
import { cx } from './cx';

describe('cx', () => {
  it('joins the provided class names', () => {
    expect(cx('a', 'b')).toBe('a b');
  });

  it('drops conditional and empty values', () => {
    expect(cx('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('returns an empty string when nothing applies', () => {
    expect(cx(false, undefined)).toBe('');
  });
});
