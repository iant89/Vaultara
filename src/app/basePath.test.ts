import { describe, expect, it } from 'vitest';
import { toRouterBasename } from './basePath';

describe('toRouterBasename', () => {
  it('strips the trailing slash Vite always adds', () => {
    expect(toRouterBasename('/Vaultara/')).toBe('/Vaultara');
  });

  it('returns an empty string for a root deployment', () => {
    expect(toRouterBasename('/')).toBe('');
  });

  it('accepts a base without a trailing slash', () => {
    expect(toRouterBasename('/Vaultara')).toBe('/Vaultara');
  });

  it('adds a missing leading slash, which would otherwise never match', () => {
    expect(toRouterBasename('Vaultara/')).toBe('/Vaultara');
  });

  it('supports a nested base path', () => {
    expect(toRouterBasename('/apps/vaultara/')).toBe('/apps/vaultara');
  });

  it('treats an empty or whitespace-only base as the root', () => {
    expect(toRouterBasename('')).toBe('');
    expect(toRouterBasename('   ')).toBe('');
  });

  it('collapses repeated trailing slashes', () => {
    expect(toRouterBasename('/Vaultara///')).toBe('/Vaultara');
  });
});
