/**
 * Which providers a global search may query (design spec 15.1, 15.4).
 *
 * Planned catalogue entries are not registered, so they never appear here. A signed-in
 * visitor's disabled-provider list is applied on top of the registry.
 */

import { DISCOVERY_ROWS } from '../config/discovery';
import { getProviderName } from '../config/providers';
import { getDeclaredContentTypes, providerSupports } from '../data/providerCapabilities';
import type { ContentType } from '../models/content';
import type { ProviderRuntime } from '../providers/composition';
import { isAdultProviderId } from './adultAccess';

export interface SearchableProvider {
  readonly id: string;
  readonly name: string;
}

export function listSearchableProviders(
  runtime: ProviderRuntime,
  disabledProviderIds: readonly string[] = [],
  options: { readonly includeAdult?: boolean } = {},
): readonly SearchableProvider[] {
  const disabled = new Set(disabledProviderIds);

  return runtime.registry
    .listEnabled()
    .filter((provider) => {
      if (disabled.has(provider.id) || !providerSupports(runtime, provider.id, 'search')) {
        return false;
      }

      if (isAdultProviderId(provider.id) && options.includeAdult !== true) {
        return false;
      }

      return true;
    })
    .map((provider) => ({ id: provider.id, name: getProviderName(provider.id) }));
}

export function parseSearchCategoryParam(value: string | null): string | undefined {
  if (value === null || value.trim() === '') {
    return undefined;
  }

  return DISCOVERY_ROWS.some((row) => row.categoryId === value) ? value : undefined;
}

export function contentTypesForSearch(options: {
  readonly type?: ContentType;
  readonly categoryId?: string;
}): readonly ContentType[] | undefined {
  if (options.type !== undefined) {
    return [options.type];
  }

  const row = DISCOVERY_ROWS.find((entry) => entry.categoryId === options.categoryId);

  return row?.contentTypes;
}

export function declaredSearchTypes(
  runtime: ProviderRuntime,
  providers: readonly SearchableProvider[],
): readonly ContentType[] {
  const types = new Set<ContentType>();

  for (const provider of providers) {
    for (const type of getDeclaredContentTypes(runtime, provider.id)) {
      types.add(type);
    }
  }

  return [...types].sort((left, right) => left.localeCompare(right));
}
