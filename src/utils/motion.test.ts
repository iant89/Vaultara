import { afterEach, describe, expect, it, vi } from 'vitest';
import { prefersReducedMotion, scrollBehavior } from './motion';

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('prefersReducedMotion', () => {
  it('reports the media query result', () => {
    mockMatchMedia(true);
    expect(prefersReducedMotion()).toBe(true);
  });

  it('reports motion as allowed when the user has no preference', () => {
    mockMatchMedia(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it('assumes motion is allowed when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe('scrollBehavior', () => {
  it('never requests a smooth scroll when motion is reduced', () => {
    mockMatchMedia(true);
    expect(scrollBehavior()).toBe('auto');
  });

  it('uses a smooth scroll otherwise', () => {
    mockMatchMedia(false);
    expect(scrollBehavior()).toBe('smooth');
  });
});
