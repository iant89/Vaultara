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
  it('reports availability per adapter, not per roadmap', async () => {
    const { PROVIDER_CATALOG } = await loadProviders(false);

    expect(PROVIDER_CATALOG.length).toBeGreaterThan(0);
    for (const provider of PROVIDER_CATALOG) {
      expect(provider.roadmapPhase).toMatch(/^Phase \d+$/);

      if (provider.availability === 'planned') {
        // Nothing to browse before the adapter exists, so no browsing phase is claimed.
        expect(provider.browsingPhase).toBeUndefined();
      } else {
        expect(provider.browsingPhase).toMatch(/^Phase \d+$/);
      }
    }
  });

  it('marks the Internet Archive as available now that its adapter exists', async () => {
    const { PROVIDER_CATALOG } = await loadProviders(false);
    const archive = PROVIDER_CATALOG.find((provider) => provider.id === 'archive');

    expect(archive).toMatchObject({
      availability: 'available',
      roadmapPhase: 'Phase 4',
      browsingPhase: 'Phase 5',
    });
  });

  it('marks Wikipedia as available now that its adapter exists', async () => {
    const { PROVIDER_CATALOG } = await loadProviders(false);
    const wikipedia = PROVIDER_CATALOG.find((provider) => provider.id === 'wikipedia');

    expect(wikipedia).toMatchObject({
      availability: 'available',
      roadmapPhase: 'Phase 13',
      browsingPhase: 'Phase 13',
    });
  });

  it('marks Adult as available now that its adapter exists', async () => {
    const { PROVIDER_CATALOG } = await loadProviders(false);
    const adult = PROVIDER_CATALOG.find((provider) => provider.id === 'adult');

    expect(adult).toMatchObject({
      availability: 'available',
      roadmapPhase: 'Phase 16',
      browsingPhase: 'Phase 16',
    });
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
