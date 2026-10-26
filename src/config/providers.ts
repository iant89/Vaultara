/**
 * Provider configuration.
 *
 * Design spec 7.1 requires provider configuration to stay separate from provider
 * implementation. This catalog holds presentation metadata only: no fetching logic and no
 * provider SDK details.
 *
 * `availability` reports whether an adapter exists, not whether a screen exists for it: the
 * Internet Archive adapter is complete (roadmap Phase 4) while its browsing interface arrives
 * with the discovery experience (Phase 5). `browsingPhase` keeps that distinction visible so the
 * interface never implies working functionality it does not have.
 */

import { appEnvironment } from './env';

export type ProviderAvailability = 'available' | 'planned';

export interface ProviderCatalogEntry {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly availability: ProviderAvailability;
  /** Roadmap phase that will deliver (or delivered) the adapter, shown as an honest status. */
  readonly roadmapPhase: string;
  /**
   * Roadmap phase that will deliver in-app browsing. Only meaningful once an adapter exists;
   * before that, the adapter itself is what is missing.
   */
  readonly browsingPhase?: string;
}

export const PROVIDER_CATALOG: readonly ProviderCatalogEntry[] = [
  {
    id: 'archive',
    name: 'Internet Archive',
    description:
      'Books, film, audio, software, and historical archives from archive.org. The primary provider.',
    availability: 'available',
    roadmapPhase: 'Phase 4',
    browsingPhase: 'Phase 5',
  },
  {
    id: 'wikipedia',
    name: 'Wikipedia',
    description: 'Articles and reference material read in a document-oriented reader.',
    availability: 'planned',
    roadmapPhase: 'Phase 13',
  },
  {
    id: 'adult',
    name: 'Adult',
    description:
      'Optional, independently configured adult content provider. Disabled unless explicitly enabled.',
    availability: 'planned',
    roadmapPhase: 'Phase 16',
  },
];

export function findProvider(providerId: string): ProviderCatalogEntry | undefined {
  return PROVIDER_CATALOG.find((provider) => provider.id === providerId);
}

/**
 * Display name for a provider id.
 *
 * Falls back to the id itself: content from a provider missing from the catalogue is still
 * attributable, and showing the raw id is more honest than inventing a name.
 */
export function getProviderName(providerId: string): string {
  return findProvider(providerId)?.name ?? providerId;
}

/**
 * Providers that may be surfaced in navigation. The Adult provider is hidden entirely
 * unless enabled, per design spec 13.3.
 */
export function getVisibleProviders(): readonly ProviderCatalogEntry[] {
  return PROVIDER_CATALOG.filter(
    (provider) => provider.id !== 'adult' || appEnvironment.adultProviderEnabled,
  );
}
