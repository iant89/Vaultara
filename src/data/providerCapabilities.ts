/**
 * Capability lookups for the interface.
 *
 * The UI derives its filters from what the provider says it can return, rather than from a
 * hard-coded list: a provider that only serves films must not offer a "Books" filter that returns
 * nothing. A provider that is not registered has no capabilities, which callers treat as
 * "nothing declared" rather than an error.
 */

import type { ContentType } from '../models/content';
import type { ProviderCapabilities } from '../models/provider';
import type { ProviderRuntime } from '../providers/composition';

export function getDeclaredContentTypes(
  runtime: ProviderRuntime,
  providerId: string,
): readonly ContentType[] {
  return runtime.registry.has(providerId)
    ? runtime.registry.getCapabilities(providerId).contentTypes
    : [];
}

/**
 * Whether a provider is registered and advertises one capability.
 *
 * Used to decide which sections a page may render at all: asking a provider for files it never
 * claimed to offer would surface an "unsupported operation" panel instead of simply not showing a
 * files section (design spec 9.3).
 */
export function providerSupports(
  runtime: ProviderRuntime,
  providerId: string,
  capability: keyof ProviderCapabilities,
): boolean {
  if (!runtime.registry.has(providerId)) {
    return false;
  }

  return runtime.registry.getCapabilities(providerId)[capability] === true;
}
