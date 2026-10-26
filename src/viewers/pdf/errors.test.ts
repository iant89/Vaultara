import { describe, expect, it } from 'vitest';
import { describePdfLoadFailure } from './errors';

describe('describePdfLoadFailure', () => {
  it('explains a CORS or network block without blaming the file format', () => {
    const error = describePdfLoadFailure(new TypeError('Failed to fetch'));

    expect(error.kind).toBe('network');
    expect(error.message).toMatch(/did not allow this site to fetch it/i);
  });

  it('keeps a parser failure as an invalid response', () => {
    const error = describePdfLoadFailure(new Error('Invalid PDF structure.'));

    expect(error.kind).toBe('invalid-response');
    expect(error.message).toBe('Invalid PDF structure.');
  });
});
