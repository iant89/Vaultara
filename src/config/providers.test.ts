import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Verifies provider visibility rules against the real catalogue.
 *
 * `appEnvironment` is validated once at module load, so each case re-imports the modules with
 * a stubbed environment. This is the only way to assert the Adult provider's opt-in
 * behaviour without shipping a module-level setter.
 */
async function loadProviders(adultEnabled: boolean) {
  vi.resetModules();
  vi.doMock('./env', () => ({
    appEnvironment: {
      mode: 'test',
      apiBaseUrl: null,
      adultProviderEnabled: adultEnabled,
    },
  }));

  return import('./providers');
}

afterEach(() => {
  vi.doUnmock('./env');
  vi.resetModules();
});

describe('provider catalogue', () => {
  it('describes every provider as planned until its adapter exists', async () => {
    const { PROVIDER_CATALOG } = await loadProviders(false);

    expect(PROVIDER_CATALOG.length).toBeGreaterThan(0);
    for (const provider of PROVIDER_CATALOG) {
      expect(provider.availability).toBe('planned');
      expect(provider.roadmapPhase).toMatch(/^Phase \d+$/);
    }
  });

  it('finds providers by id and returns undefined otherwise', async () => {
    const { findProvider } = await loadProviders(false);

    expect(findProvider('archive')?.name).toBe('Internet Archive');
    expect(findProvider('nope')).toBeUndefined();
  });

  // Design spec 13.3: the Adult provider is opt-in and must be absent by default.
  it('hides the Adult provider unless it is explicitly enabled', async () => {
    const { getVisibleProviders } = await loadProviders(false);
    const ids = getVisibleProviders().map((provider) => provider.id);

    expect(ids).toContain('archive');
    expect(ids).toContain('wikipedia');
    expect(ids).not.toContain('adult');
  });

  it('surfaces the Adult provider once enabled', async () => {
    const { getVisibleProviders } = await loadProviders(true);
    const ids = getVisibleProviders().map((provider) => provider.id);

    expect(ids).toContain('adult');
  });
});
