/**
 * Adult provider (design specification 13, roadmap Phase 16).
 *
 * Independent registry identity, independent health accounting, independent failures. The
 * underlying index is still the Internet Archive, restricted to the adults-only collection:
 * there is no second adult API, and ordinary Archive search never uses this adapter.
 */

import { ADULT_ARCHIVE_COLLECTION_ID, ADULT_PROVIDER_ID } from '../../config/adult';
import type { ContentProvider } from '../../models/provider';
import { createArchiveProvider, type ArchiveProviderOptions } from '../archive/adapter';
import { ADULT_CATEGORIES } from './catalog';

export type AdultProviderOptions = ArchiveProviderOptions;

export function createAdultProvider(options: AdultProviderOptions = {}): ContentProvider {
  return createArchiveProvider({
    ...options,
    identity: {
      id: ADULT_PROVIDER_ID,
      name: 'Adult',
      adultContent: true,
    },
    requiredCollectionIds: [ADULT_ARCHIVE_COLLECTION_ID],
    excludedCollectionIds: [],
    categories: ADULT_CATEGORIES,
  });
}
