import { describe, expect, it } from 'vitest';
import { EnvironmentConfigurationError, parseAppEnvironment } from './env';

describe('parseAppEnvironment', () => {
  it('defaults to development with no backend and the Adult provider disabled', () => {
    expect(parseAppEnvironment({})).toEqual({
      mode: 'development',
      apiBaseUrl: null,
      adultProviderEnabled: false,
    });
  });

  it('accepts a known mode case-insensitively', () => {
    expect(parseAppEnvironment({ MODE: 'PRODUCTION' }).mode).toBe('production');
  });

  it('rejects an unknown mode instead of guessing', () => {
    expect(() => parseAppEnvironment({ MODE: 'staging' })).toThrow(EnvironmentConfigurationError);
  });

  it('normalizes a valid api base url and drops a trailing slash', () => {
    expect(parseAppEnvironment({ VITE_API_BASE_URL: 'https://api.example.com/' }).apiBaseUrl).toBe(
      'https://api.example.com',
    );
  });

  it('treats an empty api base url as frontend-only', () => {
    expect(parseAppEnvironment({ VITE_API_BASE_URL: '   ' }).apiBaseUrl).toBeNull();
  });

  it.each(['api.example.com', 'not a url', 'ftp://files.example.com'])(
    'rejects the invalid api base url %j',
    (value) => {
      expect(() => parseAppEnvironment({ VITE_API_BASE_URL: value })).toThrow(
        EnvironmentConfigurationError,
      );
    },
  );

  it('names the offending variable', () => {
    try {
      parseAppEnvironment({ VITE_API_BASE_URL: 'javascript:alert(1)' });
      expect.unreachable('expected a configuration error');
    } catch (error) {
      expect(error).toBeInstanceOf(EnvironmentConfigurationError);
      expect((error as EnvironmentConfigurationError).variable).toBe('VITE_API_BASE_URL');
    }
  });

  it.each(['true', 'TRUE', '1', 'yes'])('enables the Adult provider for %j', (value) => {
    expect(parseAppEnvironment({ VITE_ENABLE_ADULT_PROVIDER: value }).adultProviderEnabled).toBe(
      true,
    );
  });

  it.each(['', 'false', '0', 'no'])('keeps the Adult provider disabled for %j', (value) => {
    expect(parseAppEnvironment({ VITE_ENABLE_ADULT_PROVIDER: value }).adultProviderEnabled).toBe(
      false,
    );
  });

  it('rejects an ambiguous boolean so a typo cannot silently change a safety control', () => {
    expect(() => parseAppEnvironment({ VITE_ENABLE_ADULT_PROVIDER: 'ture' })).toThrow(
      EnvironmentConfigurationError,
    );
  });
});
