/**
 * Provider services available to the interface: the runtime (registry + gateway) and the cached
 * query layer built on top of it.
 *
 * Components never import an adapter or construct a registry; they read this context. The default
 * is the shared runtime from the composition root, created on first use, so a test can wrap a
 * subtree in `ProviderServicesProvider` with its own services and exercise the real pages against
 * a stubbed transport.
 */

import { createContext, useContext, type ReactNode } from 'react';
import { getProviderRuntime, type ProviderRuntime } from '../providers/composition';
import {
  createContentQueries,
  type ContentQueries,
  type ContentQueriesOptions,
} from './contentQueries';

export interface ProviderServices {
  readonly runtime: ProviderRuntime;
  readonly queries: ContentQueries;
}

export function createProviderServices(
  runtime: ProviderRuntime = getProviderRuntime(),
  options: ContentQueriesOptions = {},
): ProviderServices {
  return { runtime, queries: createContentQueries(runtime.gateway, options) };
}

const ProviderServicesContext = createContext<ProviderServices | undefined>(undefined);

let sharedServices: ProviderServices | undefined;

/** The application-wide services, created lazily so importing a module has no side effects. */
export function getSharedProviderServices(): ProviderServices {
  sharedServices ??= createProviderServices();

  return sharedServices;
}

/** Drop the shared services. Intended for tests. */
export function resetProviderServices(): void {
  sharedServices = undefined;
}

interface ProviderServicesProviderProps {
  readonly services: ProviderServices;
  readonly children: ReactNode;
}

export function ProviderServicesProvider({ services, children }: ProviderServicesProviderProps) {
  return (
    <ProviderServicesContext.Provider value={services}>{children}</ProviderServicesContext.Provider>
  );
}

export function useProviderServices(): ProviderServices {
  return useContext(ProviderServicesContext) ?? getSharedProviderServices();
}
