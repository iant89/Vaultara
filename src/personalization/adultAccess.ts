/**
 * Adult provider access and shared-list visibility (design spec 13, roadmap Phase 16).
 *
 * Three independent switches, all of which must be considered:
 *
 * 1. Deploy flag (`VITE_ENABLE_ADULT_PROVIDER`) — a kill switch. When off, Adult is not
 *    registered and cannot be turned on from Settings.
 * 2. Signed-in opt-in plus local age confirmation — this static GitHub Pages build cannot
 *    verify identity; the confirmation is a device-local statement, not ID verification.
 * 3. Shared-list hiding — favorites and history may still store Adult identities, but they
 *    must not appear when the reader asked to keep them off shared screens.
 */

import { ADULT_PROVIDER_ID } from '../config/adult';
import { appEnvironment } from '../config/env';
import type { ProviderCatalogEntry } from '../config/providers';
import type { UserPreferences } from '../models/account';

export function isAdultProviderId(providerId: string): boolean {
  return providerId === ADULT_PROVIDER_ID;
}

export function isAdultContentAccessible(
  preferences: UserPreferences,
  env: { readonly adultProviderEnabled: boolean } = appEnvironment,
): boolean {
  return env.adultProviderEnabled && preferences.adultAgeConfirmed && preferences.adultOptIn;
}

export function shouldShowAdultInSharedLists(
  preferences: UserPreferences,
  env: { readonly adultProviderEnabled: boolean } = appEnvironment,
): boolean {
  return isAdultContentAccessible(preferences, env) && !preferences.hideAdultInSharedLists;
}

export function listConfigurableProviders(
  providers: readonly ProviderCatalogEntry[],
  preferences: UserPreferences,
  env: { readonly adultProviderEnabled: boolean } = appEnvironment,
): readonly ProviderCatalogEntry[] {
  const adultAccessible = isAdultContentAccessible(preferences, env);

  return providers.filter((provider) => !isAdultProviderId(provider.id) || adultAccessible);
}

export function listNavigableProviders(
  providers: readonly ProviderCatalogEntry[],
  preferences: UserPreferences,
  env: { readonly adultProviderEnabled: boolean } = appEnvironment,
): readonly ProviderCatalogEntry[] {
  const disabled = new Set(preferences.disabledProviderIds);

  return listConfigurableProviders(providers, preferences, env).filter(
    (provider) => !disabled.has(provider.id),
  );
}

export function filterHiddenAdultRecords<T extends { readonly providerId: string }>(
  records: readonly T[],
  preferences: UserPreferences,
  env: { readonly adultProviderEnabled: boolean } = appEnvironment,
): readonly T[] {
  if (shouldShowAdultInSharedLists(preferences, env)) {
    return records;
  }

  return records.filter((record) => !isAdultProviderId(record.providerId));
}
