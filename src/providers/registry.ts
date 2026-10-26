/**
 * Provider registry (design specification 10.4).
 *
 * The registry owns three things and nothing else: which providers exist, whether they are
 * enabled, and how healthy they currently look. It performs no fetching, so it can be built and
 * tested without a network, and it cannot become the place provider-specific logic accumulates.
 *
 * Failure isolation is the point of the design. A provider whose initialization throws is
 * marked failed and left out of the available set; every other provider keeps working.
 */

import {
  attachProviderId,
  createAppError,
  getDefaultErrorMessage,
  toAppError,
  type AppError,
} from '../models/errors';
import { isValidProviderId } from '../models/identity';
import type { ContentProvider, ProviderCapabilities } from '../models/provider';
import { validateProviderCapabilities } from './validate';

export type ProviderStatus = 'uninitialized' | 'initializing' | 'ready' | 'failed';

export interface ProviderHealth {
  /** Lifecycle state, independent of the outcome of individual requests. */
  readonly status: ProviderStatus;
  readonly enabled: boolean;
  /**
   * Whether the core should send requests to this provider now: enabled, not failed, and not
   * over the consecutive-failure threshold. Health is reported separately from enablement so a
   * UI can tell "switched off" apart from "currently broken".
   */
  readonly available: boolean;
  readonly consecutiveFailures: number;
  readonly lastError?: AppError;
  readonly lastSuccessAt?: number;
  readonly lastFailureAt?: number;
}

interface ProviderEntry {
  readonly provider: ContentProvider;
  readonly capabilities: ProviderCapabilities;
  enabled: boolean;
  status: ProviderStatus;
  consecutiveFailures: number;
  lastError?: AppError;
  lastSuccessAt?: number;
  lastFailureAt?: number;
  initialization?: Promise<ProviderStatus>;
}

export interface ProviderRegistryOptions {
  /** Injectable clock so health timestamps are testable. */
  readonly now?: () => number;
  /** Consecutive request failures before a provider is reported unavailable. */
  readonly failureThreshold?: number;
}

export const DEFAULT_FAILURE_THRESHOLD = 3;

type Listener = () => void;

function freezeCapabilities(capabilities: ProviderCapabilities): ProviderCapabilities {
  return Object.freeze({
    ...capabilities,
    contentTypes: Object.freeze([...capabilities.contentTypes]),
  });
}

export class ProviderRegistry {
  private readonly entries = new Map<string, ProviderEntry>();
  private readonly listeners = new Set<Listener>();
  private readonly now: () => number;
  private readonly failureThreshold: number;

  constructor(options: ProviderRegistryOptions = {}) {
    this.now = options.now ?? Date.now;
    this.failureThreshold =
      options.failureThreshold !== undefined && options.failureThreshold > 0
        ? Math.trunc(options.failureThreshold)
        : DEFAULT_FAILURE_THRESHOLD;
  }

  /**
   * Register a provider.
   *
   * Throws for a malformed or duplicate provider rather than returning a boolean: both are
   * programming errors that would otherwise surface much later as missing content.
   */
  register(provider: ContentProvider): void {
    if (typeof provider !== 'object' || provider === null) {
      throw new TypeError('A provider must be an object.');
    }

    const { id } = provider;

    if (typeof id !== 'string' || !isValidProviderId(id)) {
      throw new TypeError(
        `Invalid provider id ${JSON.stringify(id)}: expected lowercase letters, digits, and hyphens.`,
      );
    }

    if (typeof provider.name !== 'string' || provider.name.trim() === '') {
      throw new TypeError(`Provider ${JSON.stringify(id)} must have a display name.`);
    }

    if (typeof provider.version !== 'string' || provider.version.trim() === '') {
      throw new TypeError(`Provider ${JSON.stringify(id)} must declare a version.`);
    }

    if (this.entries.has(id)) {
      throw new TypeError(`Provider ${JSON.stringify(id)} is already registered.`);
    }

    let capabilities: ProviderCapabilities;

    try {
      capabilities = validateProviderCapabilities(provider.getCapabilities(), id);
    } catch (error) {
      throw new TypeError(
        `Provider ${JSON.stringify(id)} declared invalid capabilities: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { cause: error },
      );
    }

    this.entries.set(id, {
      provider,
      capabilities: freezeCapabilities(capabilities),
      enabled: true,
      status: 'uninitialized',
      consecutiveFailures: 0,
    });

    this.notify();
  }

  /** Remove a provider. Returns whether it was registered. */
  unregister(id: string): boolean {
    const removed = this.entries.delete(id);

    if (removed) {
      this.notify();
    }

    return removed;
  }

  has(id: string): boolean {
    return this.entries.has(id);
  }

  /** The provider, or `undefined`. Prefer `require` where absence is a caller error. */
  get(id: string): ContentProvider | undefined {
    return this.entries.get(id)?.provider;
  }

  /** The provider, or an `AppError` when it is not registered. */
  require(id: string): ContentProvider {
    return this.requireEntry(id).provider;
  }

  list(): readonly ContentProvider[] {
    return [...this.entries.values()].map((entry) => entry.provider);
  }

  listEnabled(): readonly ContentProvider[] {
    return [...this.entries.values()]
      .filter((entry) => entry.enabled)
      .map((entry) => entry.provider);
  }

  ids(): readonly string[] {
    return [...this.entries.keys()];
  }

  isEnabled(id: string): boolean {
    return this.requireEntry(id).enabled;
  }

  setEnabled(id: string, enabled: boolean): void {
    const entry = this.requireEntry(id);

    if (entry.enabled === enabled) {
      return;
    }

    entry.enabled = enabled;
    this.notify();
  }

  /** Capabilities declared at registration, frozen and already validated. */
  getCapabilities(id: string): ProviderCapabilities {
    return this.requireEntry(id).capabilities;
  }

  getStatus(id: string): ProviderStatus {
    return this.requireEntry(id).status;
  }

  getHealth(id: string): ProviderHealth {
    return this.buildHealth(this.requireEntry(id));
  }

  listHealth(): readonly (ProviderHealth & { readonly id: string })[] {
    return [...this.entries.entries()].map(([id, entry]) => ({
      id,
      ...this.buildHealth(entry),
    }));
  }

  /**
   * Run a provider's optional initialization once.
   *
   * Concurrent callers share one attempt. A failed attempt leaves the provider registered and
   * retryable — the next call tries again — while every other provider is unaffected.
   */
  async initialize(id: string): Promise<ProviderStatus> {
    const entry = this.requireEntry(id);

    if (entry.status === 'ready') {
      return 'ready';
    }

    const inFlight = entry.initialization;

    if (inFlight !== undefined) {
      return inFlight;
    }

    const attempt = this.runInitialization(id, entry);
    entry.initialization = attempt;

    return attempt;
  }

  /** Initialize every registered provider, isolating failures. Never rejects. */
  async initializeAll(): Promise<ReadonlyMap<string, ProviderStatus>> {
    const results = new Map<string, ProviderStatus>();

    await Promise.all(
      this.ids().map(async (id) => {
        results.set(id, await this.initialize(id));
      }),
    );

    return results;
  }

  /**
   * Refresh reported health using the provider's optional probe.
   *
   * The probe is expected to be cheap; it is called without the gateway's request policy, so an
   * expensive probe would defeat the purpose. Providers without one simply report current state.
   */
  async checkHealth(id: string): Promise<ProviderHealth> {
    const entry = this.requireEntry(id);

    if (entry.provider.checkHealth === undefined) {
      return this.buildHealth(entry);
    }

    try {
      const healthy = await entry.provider.checkHealth();

      if (healthy) {
        this.recordSuccess(id);
      } else {
        // An explicit "unhealthy" answer is decisive: the provider itself says it cannot serve,
        // so waiting for three failed requests would waste them.
        entry.status = 'failed';
        this.recordFailure(
          id,
          createAppError('provider-unavailable', getDefaultErrorMessage('provider-unavailable'), {
            providerId: id,
          }),
        );
      }
    } catch (error) {
      // A probe that throws is inconclusive rather than authoritative — a buggy probe must not
      // take an otherwise working provider offline. It counts toward the failure streak only.
      this.recordFailure(id, attachProviderId(toAppError(error), id));
    }

    return this.buildHealth(entry);
  }

  /** Record a successful request: clears the failure streak and any failed status. */
  recordSuccess(id: string): void {
    const entry = this.requireEntry(id);

    entry.consecutiveFailures = 0;
    entry.lastSuccessAt = this.now();
    entry.lastError = undefined;

    if (entry.status === 'failed') {
      entry.status = 'ready';
    }

    this.notify();
  }

  /** Record a failed request. The failure streak decides availability, not the status. */
  recordFailure(id: string, error: AppError): void {
    const entry = this.requireEntry(id);

    entry.consecutiveFailures += 1;
    entry.lastFailureAt = this.now();
    entry.lastError = attachProviderId(error, id);

    this.notify();
  }

  /** Subscribe to any state change. Returns an unsubscribe function. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private requireEntry(id: string): ProviderEntry {
    const entry = this.entries.get(id);

    if (entry === undefined) {
      throw createAppError('not-found', `Provider ${JSON.stringify(id)} is not registered.`, {
        providerId: id,
      });
    }

    return entry;
  }

  private buildHealth(entry: ProviderEntry): ProviderHealth {
    const available =
      entry.enabled &&
      entry.status !== 'failed' &&
      entry.consecutiveFailures < this.failureThreshold;

    return {
      status: entry.status,
      enabled: entry.enabled,
      available,
      consecutiveFailures: entry.consecutiveFailures,
      ...(entry.lastError !== undefined ? { lastError: entry.lastError } : {}),
      ...(entry.lastSuccessAt !== undefined ? { lastSuccessAt: entry.lastSuccessAt } : {}),
      ...(entry.lastFailureAt !== undefined ? { lastFailureAt: entry.lastFailureAt } : {}),
    };
  }

  private async runInitialization(id: string, entry: ProviderEntry): Promise<ProviderStatus> {
    entry.status = 'initializing';
    this.notify();

    try {
      await entry.provider.initialize?.();
      entry.status = 'ready';
      entry.consecutiveFailures = 0;
      entry.lastError = undefined;
    } catch (error) {
      // A provider that cannot start is isolated, not fatal: the registry keeps serving the
      // others and reports this one as unavailable.
      entry.status = 'failed';
      entry.lastError = attachProviderId(toAppError(error), id);
      entry.lastFailureAt = this.now();
    } finally {
      entry.initialization = undefined;
      this.notify();
    }

    return entry.status;
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        // A broken subscriber must not stop the others from being told, nor break the registry.
      }
    }
  }
}
