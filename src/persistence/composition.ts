/**
 * Persistence composition root.
 *
 * The default backend is IndexedDB on this device. Tests inject a memory store so they never
 * touch the live database. Importing this module has no side effects.
 */

import type { AccountBackend } from './contract';
import { createLocalAccountBackend, type LocalAccountBackendOptions } from './localBackend';
import { createMemoryKvStore } from './memoryKv';

let shared: AccountBackend | undefined;

export function createPersistence(options: LocalAccountBackendOptions = {}): AccountBackend {
  return createLocalAccountBackend(options);
}

/** Memory-backed backend with a cheap password hash. For tests only. */
export function createTestPersistence(options: LocalAccountBackendOptions = {}): AccountBackend {
  return createLocalAccountBackend({
    ...options,
    kv: options.kv ?? createMemoryKvStore(),
    pbkdf2Iterations: options.pbkdf2Iterations ?? 10,
  });
}

export function getSharedPersistence(): AccountBackend {
  shared ??= createLocalAccountBackend();

  return shared;
}

/** Drop the shared backend. Intended for tests. */
export function resetSharedPersistence(): void {
  shared = undefined;
}
