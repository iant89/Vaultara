import { createPersistenceError } from './errors';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 256;
const MAX_DISPLAY_NAME_LENGTH = 80;

function hasControlCharacters(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;

    if (code < 32 || code === 127) {
      return true;
    }
  }

  return false;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validateEmail(value: string): string {
  const email = normalizeEmail(value);

  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    throw createPersistenceError('validation', 'Enter a valid email address.');
  }

  return email;
}

export function validatePassword(value: string): string {
  if (value.length < MIN_PASSWORD_LENGTH || value.length > MAX_PASSWORD_LENGTH) {
    throw createPersistenceError(
      'validation',
      `Password must be between ${String(MIN_PASSWORD_LENGTH)} and ${String(MAX_PASSWORD_LENGTH)} characters.`,
    );
  }

  if (value.trim().length === 0) {
    throw createPersistenceError('validation', 'Password cannot be only whitespace.');
  }

  return value;
}

export function validateDisplayName(value: string): string {
  const name = value.trim();

  if (name.length === 0) {
    throw createPersistenceError('validation', 'Enter a display name.');
  }

  if (name.length > MAX_DISPLAY_NAME_LENGTH) {
    throw createPersistenceError(
      'validation',
      `Display name must be at most ${String(MAX_DISPLAY_NAME_LENGTH)} characters.`,
    );
  }

  if (hasControlCharacters(name)) {
    throw createPersistenceError('validation', 'Display name cannot contain control characters.');
  }

  return name;
}
