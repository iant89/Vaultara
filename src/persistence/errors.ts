/**
 * Failures from the account and persistence layer.
 *
 * These are not provider errors: a bad password is not a network problem, and mixing the two
 * models would make discovery retry a sign-in. Callers map `code` onto form copy.
 */

export type PersistenceFailureCode =
  'validation' | 'unauthorized' | 'conflict' | 'not-found' | 'unavailable';

export interface PersistenceError {
  readonly name: 'PersistenceError';
  readonly code: PersistenceFailureCode;
  readonly message: string;
}

const DEFAULT_MESSAGES: Readonly<Record<PersistenceFailureCode, string>> = {
  validation: 'That information could not be accepted.',
  unauthorized: 'You are not signed in.',
  conflict: 'That account already exists.',
  'not-found': 'That account could not be found.',
  unavailable: 'Account storage is not available in this browser.',
};

export function createPersistenceError(
  code: PersistenceFailureCode,
  message: string,
): PersistenceError {
  const trimmed = message.trim();

  return {
    name: 'PersistenceError',
    code,
    message: trimmed.length > 0 ? trimmed : DEFAULT_MESSAGES[code],
  };
}

export function isPersistenceError(value: unknown): value is PersistenceError {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as { name?: unknown; code?: unknown; message?: unknown };

  return (
    candidate.name === 'PersistenceError' &&
    typeof candidate.code === 'string' &&
    typeof candidate.message === 'string'
  );
}

export function toPersistenceError(value: unknown): PersistenceError {
  if (isPersistenceError(value)) {
    return value;
  }

  if (value instanceof Error && value.message.trim().length > 0) {
    return createPersistenceError('unavailable', value.message);
  }

  return createPersistenceError('unavailable', DEFAULT_MESSAGES.unavailable);
}
