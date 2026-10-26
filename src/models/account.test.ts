import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES, normalizePreferences } from './account';

describe('normalizePreferences', () => {
  it('fills missing Phase 7 fields from older stored documents', () => {
    expect(
      normalizePreferences({
        selectedCategoryIds: ['movies'],
        disabledProviderIds: ['wikipedia'],
        historyTrackingEnabled: false,
      }),
    ).toEqual({
      selectedCategoryIds: ['movies'],
      disabledProviderIds: ['wikipedia'],
      historyTrackingEnabled: false,
      hideExploredFromDiscovery: true,
      onboardingCompleted: false,
    });
  });

  it('returns the defaults for unusable input', () => {
    expect(normalizePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(normalizePreferences('nope')).toEqual(DEFAULT_PREFERENCES);
  });
});
