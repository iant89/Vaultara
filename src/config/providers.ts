/**
 * Provider configuration.
 *
 * Design spec 7.1 requires provider configuration to stay separate from provider
 * implementation. This catalog holds presentation metadata only: no fetching logic and no
 * provider SDK details. Adapters arrive in roadmap Phases 4, 13, and 16; until then every
 * entry is marked `planned` so the interface never implies working functionality.
 */

import { appEnvironment } from './env';

export type ProviderAvailability = 'available' | 'planned';

export interface ProviderCatalogEntry {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly availability: ProviderAvailability;
  /** Roadmap phase that will deliver the adapter, shown to users as an honest status. */
  readonly roadmapPhase: string;
}

export const PROVIDER_CATALOG: readonly ProviderCatalogEntry[] = [
  {
    id: 'archive',
    name: 'Internet Archive',
    description:
      'Books, film, audio, software, and historical archives from archive.org. The primary provider.',
    availability: 'planned',
    roadmapPhase: 'Phase 4',
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
 * Providers that may be surfaced in navigation. The Adult provider is hidden entirely
 * unless enabled, per design spec 13.3.
 */
export function getVisibleProviders(): readonly ProviderCatalogEntry[] {
  return PROVIDER_CATALOG.filter(
    (provider) => provider.id !== 'adult' || appEnvironment.adultProviderEnabled,
  );
}
