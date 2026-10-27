import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from '../models/account';
import {
  filterHiddenAdultRecords,
  isAdultContentAccessible,
  isAdultProviderId,
  listConfigurableProviders,
  listNavigableProviders,
  shouldShowAdultInSharedLists,
} from './adultAccess';

const ENABLED = { adultProviderEnabled: true };
const DISABLED = { adultProviderEnabled: false };

const OPTED_IN = {
  ...DEFAULT_PREFERENCES,
  adultAgeConfirmed: true,
  adultOptIn: true,
  hideAdultInSharedLists: true,
};

describe('adult access', () => {
  it('treats only the adult id as adult', () => {
    expect(isAdultProviderId('adult')).toBe(true);
    expect(isAdultProviderId('archive')).toBe(false);
  });

  it('requires the deploy flag, age confirmation, and opt-in together', () => {
    expect(isAdultContentAccessible(DEFAULT_PREFERENCES, ENABLED)).toBe(false);
    expect(isAdultContentAccessible({ ...OPTED_IN, adultOptIn: false }, ENABLED)).toBe(false);
    expect(isAdultContentAccessible({ ...OPTED_IN, adultAgeConfirmed: false }, ENABLED)).toBe(
      false,
    );
    expect(isAdultContentAccessible(OPTED_IN, DISABLED)).toBe(false);
    expect(isAdultContentAccessible(OPTED_IN, ENABLED)).toBe(true);
  });

  it('hides Adult from navigation until it is accessible', () => {
    const catalog = [
      {
        id: 'archive',
        name: 'Internet Archive',
        description: '',
        availability: 'available' as const,
        roadmapPhase: 'Phase 4',
      },
      {
        id: 'adult',
        name: 'Adult',
        description: '',
        availability: 'available' as const,
        roadmapPhase: 'Phase 16',
      },
    ];

    expect(listNavigableProviders(catalog, DEFAULT_PREFERENCES, ENABLED).map((p) => p.id)).toEqual([
      'archive',
    ]);
    expect(
      listConfigurableProviders(catalog, DEFAULT_PREFERENCES, ENABLED).map((p) => p.id),
    ).toEqual(['archive']);
    expect(listNavigableProviders(catalog, OPTED_IN, ENABLED).map((p) => p.id)).toEqual([
      'archive',
      'adult',
    ]);
    expect(
      listNavigableProviders(catalog, { ...OPTED_IN, disabledProviderIds: ['adult'] }, ENABLED).map(
        (p) => p.id,
      ),
    ).toEqual(['archive']);
  });

  it('keeps Adult identities out of shared lists by default', () => {
    const records = [
      { providerId: 'archive', itemId: 'night' },
      { providerId: 'adult', itemId: 'restricted' },
    ];

    expect(shouldShowAdultInSharedLists(OPTED_IN, ENABLED)).toBe(false);
    expect(filterHiddenAdultRecords(records, OPTED_IN, ENABLED)).toEqual([records[0]]);
    expect(
      filterHiddenAdultRecords(records, { ...OPTED_IN, hideAdultInSharedLists: false }, ENABLED),
    ).toEqual(records);
    expect(filterHiddenAdultRecords(records, DEFAULT_PREFERENCES, ENABLED)).toEqual([records[0]]);
  });
});
