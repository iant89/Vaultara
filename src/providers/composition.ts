/**
 * Provider composition root (design specification 10.4, AGENTS.md §5.7).
 *
 * This is the only place an adapter is constructed and registered, and the only place the
 * application obtains a gateway. Adding a provider means adding a factory here — no page, hook, or
 * component may `new ProviderRegistry()` or import an adapter directly, which is what stops
 * provider-specific knowledge from spreading through the application core.
 *
 * The runtime is created lazily rather than at module load, so importing a module that merely
 * mentions the runtime does not construct network clients as a side effect.
 */

import { appEnvironment } from '../config/env';
import type { ContentProvider } from '../models/provider';
import { createAdultProvider, type AdultProviderOptions } from './adult/adapter';
import { createArchiveProvider, type ArchiveProviderOptions } from './archive/adapter';
import { ProviderGateway, type ProviderGatewayOptions } from './gateway';
import { ProviderRegistry, type ProviderRegistryOptions } from './registry';
import { createWikipediaProvider, type WikipediaProviderOptions } from './wikipedia/adapter';

/** Builds one adapter. Factories keep construction details out of the runtime. */
export type ProviderFactory = () => ContentProvider;

export interface ProviderRuntime {
  readonly registry: ProviderRegistry;
  readonly gateway: ProviderGateway;
}

export interface CreateProviderRuntimeOptions {
  /**
   * Replaces the default provider set. Used by tests to compose a runtime around a stub, and by
   * later phases that add providers without editing this file's default list.
   */
  readonly factories?: readonly ProviderFactory[];
  readonly registry?: ProviderRegistryOptions;
  readonly gateway?: ProviderGatewayOptions;
  /** Transport and host override for the Archive adapter (tests inject a fake `fetch`). */
  readonly archive?: ArchiveProviderOptions;
  /** Transport and host override for the Wikipedia adapter (tests inject a fake `fetch`). */
  readonly wikipedia?: WikipediaProviderOptions;
  /** Transport override for the Adult adapter. Ignored unless Adult is enabled. */
  readonly adult?: AdultProviderOptions;
  /** Overrides the deploy flag so tests can register Adult without mutating `import.meta.env`. */
  readonly adultEnabled?: boolean;
}

export function defaultProviderFactories(
  archive: ArchiveProviderOptions = {},
  wikipedia: WikipediaProviderOptions = {},
  adult: AdultProviderOptions = {},
  adultEnabled: boolean = appEnvironment.adultProviderEnabled,
): readonly ProviderFactory[] {
  const factories: ProviderFactory[] = [
    () => createArchiveProvider(archive),
    () => createWikipediaProvider(wikipedia),
  ];

  if (adultEnabled) {
    factories.push(() => createAdultProvider(adult));
  }

  return factories;
}

/**
 * Compose a registry and gateway over the requested providers.
 *
 * Registration is eager and synchronous: a provider with invalid capabilities throws here, during
 * application startup, rather than midway through a page. Runtime requests still reach the
 * provider only through `gateway`.
 */
export function createProviderRuntime(options: CreateProviderRuntimeOptions = {}): ProviderRuntime {
  const registry = new ProviderRegistry(options.registry);
  const factories =
    options.factories ??
    defaultProviderFactories(
      options.archive ?? {},
      options.wikipedia ?? {},
      options.adult ?? {},
      options.adultEnabled ?? appEnvironment.adultProviderEnabled,
    );

  for (const factory of factories) {
    registry.register(factory());
  }

  return { registry, gateway: new ProviderGateway(registry, options.gateway) };
}

let sharedRuntime: ProviderRuntime | undefined;

/** The application-wide runtime, created on first use. */
export function getProviderRuntime(): ProviderRuntime {
  sharedRuntime ??= createProviderRuntime();

  return sharedRuntime;
}

/**
 * Drop the shared runtime. Intended for tests and for a future provider-preferences screen that
 * needs to recompose after the enabled set changes; it is not called during normal use.
 */
export function resetProviderRuntime(): void {
  sharedRuntime = undefined;
}
