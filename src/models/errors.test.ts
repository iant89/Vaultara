import { describe, expect, it } from 'vitest';
import { createAppError, getDefaultErrorMessage, isAppError, toAppError } from './errors';

describe('createAppError', () => {
  it('keeps an explicit message', () => {
    expect(createAppError('network', 'Connection reset').message).toBe('Connection reset');
  });

  it('falls back to the kind default when the message is blank', () => {
    expect(createAppError('rate-limited', '   ').message).toBe(
      getDefaultErrorMessage('rate-limited'),
    );
  });

  it('carries the provider id when supplied', () => {
    expect(createAppError('provider-unavailable', '', { providerId: 'archive' })).toMatchObject({
      kind: 'provider-unavailable',
      providerId: 'archive',
    });
  });
});

describe('isAppError', () => {
  it('recognizes a normalized error', () => {
    expect(isAppError(createAppError('timeout', 'Too slow'))).toBe(true);
  });

  it.each([
    ['a plain Error', new Error('boom')],
    ['an object with an unknown kind', { kind: 'exploded', message: 'boom' }],
    ['an object missing a message', { kind: 'network' }],
    ['null', null],
    ['a string', 'boom'],
  ])('rejects %s', (_label, value) => {
    expect(isAppError(value)).toBe(false);
  });
});

describe('toAppError', () => {
  it('passes an already normalized error through unchanged', () => {
    const original = createAppError('not-found', 'Missing item');
    expect(toAppError(original)).toBe(original);
  });

  it('classifies a cancelled request so callers can ignore it', () => {
    const abortError = new DOMException('The operation was aborted.', 'AbortError');
    expect(toAppError(abortError).kind).toBe('cancelled');
  });

  it('preserves the message of a thrown Error and applies the fallback kind', () => {
    const converted = toAppError(new Error('Boom'), 'invalid-response');
    expect(converted).toMatchObject({ kind: 'invalid-response', message: 'Boom' });
  });

  it('uses the kind default when a thrown Error has no message', () => {
    expect(toAppError(new Error(''), 'network').message).toBe(getDefaultErrorMessage('network'));
  });

  it('accepts a thrown string', () => {
    expect(toAppError('Exploded', 'provider-unavailable')).toMatchObject({
      kind: 'provider-unavailable',
      message: 'Exploded',
    });
  });

  it.each([undefined, null, 42, { nope: true }])(
    'normalizes the unknown value %j into a safe default',
    (value) => {
      expect(toAppError(value)).toMatchObject({
        kind: 'unknown',
        message: getDefaultErrorMessage('unknown'),
      });
    },
  );
});
