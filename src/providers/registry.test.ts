import { describe, expect, it, vi } from 'vitest';
import { PROVIDER_CATALOG } from '../config/providers';
import { createAppError, type AppError } from '../models/errors';
import { createFakeProvider } from '../test/fakeProvider';
import { DEFAULT_FAILURE_THRESHOLD, ProviderRegistry } from './registry';

function createClock(start = 1_000): { readonly now: () => number; advance: (ms: number) => void } {
  let current = start;

  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
    },
  };
}

describe('registration', () => {
  it('registers a provider and exposes it by id', () => {
    const registry = new ProviderRegistry();
    const provider = createFakeProvider({ id: 'archive' });

    registry.register(provider);

    expect(registry.has('archive')).toBe(true);
    expect(registry.get('archive')).toBe(provider);
    expect(registry.require('archive')).toBe(provider);
    expect(registry.list()).toEqual([provider]);
    expect(registry.ids()).toEqual(['archive']);
  });

  it('rejects a duplicate id rather than silently replacing the first provider', () => {
    const registry = new ProviderRegistry();
    registry.register(createFakeProvider({ id: 'archive' }));

    expect(() => registry.register(createFakeProvider({ id: 'archive' }))).toThrow(
      /already registered/,
    );
    expect(registry.list()).toHaveLength(1);
  });

  it.each(['Archive', 'archive org', 'archive_org', ''])('rejects the malformed id %j', (id) => {
    const registry = new ProviderRegistry();

    expect(() => registry.register(createFakeProvider({ id }))).toThrow(TypeError);
  });

  it('rejects a provider without a name or version', () => {
    const registry = new ProviderRegistry();

    expect(() => registry.register(createFakeProvider({ id: 'a', name: '  ' }))).toThrow(/name/);
    expect(() => registry.register(createFakeProvider({ id: 'b', version: '' }))).toThrow(
      /version/,
    );
  });

  it('rejects a malformed capability declaration at registration time', () => {
    const registry = new ProviderRegistry();
    const provider = {
      ...createFakeProvider({ id: 'broken' }),
      getCapabilities: () => ({ search: 'yes' }) as never,
    };

    expect(() => registry.register(provider)).toThrow(/invalid capabilities/);
  });

  it('reports an unknown provider as a not-found error', () => {
    const registry = new ProviderRegistry();

    expect(registry.has('nobody')).toBe(false);
    expect(registry.get('nobody')).toBeUndefined();

    try {
      registry.require('nobody');
      expect.unreachable('require should have thrown');
    } catch (error) {
      expect((error as AppError).kind).toBe('not-found');
    }
  });

  it('unregisters a provider', () => {
    const registry = new ProviderRegistry();
    registry.register(createFakeProvider({ id: 'archive' }));

    expect(registry.unregister('archive')).toBe(true);
    expect(registry.unregister('archive')).toBe(false);
    expect(registry.has('archive')).toBe(false);
  });
});

describe('capabilities', () => {
  it('exposes the declared capabilities and freezes them', () => {
    const registry = new ProviderRegistry();
    registry.register(
      createFakeProvider({
        id: 'archive',
        capabilities: { search: true, collections: false, contentTypes: ['movie'] },
      }),
    );

    const capabilities = registry.getCapabilities('archive');

    expect(capabilities.search).toBe(true);
    expect(capabilities.collections).toBe(false);
    expect(capabilities.contentTypes).toEqual(['movie']);
    expect(Object.isFrozen(capabilities)).toBe(true);
    expect(Object.isFrozen(capabilities.contentTypes)).toBe(true);
  });
});

describe('enable and disable', () => {
  it('starts enabled and can be switched off and on', () => {
    const registry = new ProviderRegistry();
    registry.register(createFakeProvider({ id: 'adult' }));

    expect(registry.isEnabled('adult')).toBe(true);
    expect(registry.getHealth('adult').available).toBe(true);

    registry.setEnabled('adult', false);

    expect(registry.isEnabled('adult')).toBe(false);
    expect(registry.listEnabled()).toEqual([]);
    expect(registry.getHealth('adult')).toMatchObject({ enabled: false, available: false });

    registry.setEnabled('adult', true);

    expect(registry.listEnabled()).toHaveLength(1);
  });

  it('rejects enabling an unregistered provider', () => {
    const registry = new ProviderRegistry();

    expect(() => registry.setEnabled('nobody', false)).toThrow(/not registered/);
  });
});

describe('initialization', () => {
  it('marks a provider ready when it has nothing to initialize', async () => {
    const registry = new ProviderRegistry();
    registry.register(createFakeProvider({ id: 'archive' }));

    expect(registry.getStatus('archive')).toBe('uninitialized');
    await expect(registry.initialize('archive')).resolves.toBe('ready');
    expect(registry.getStatus('archive')).toBe('ready');
  });

  it('runs the initializer once and reports the in-flight status', async () => {
    const registry = new ProviderRegistry();
    const initialize = vi.fn(async () => undefined);
    registry.register(createFakeProvider({ id: 'archive', initialize }));

    const first = registry.initialize('archive');

    expect(registry.getStatus('archive')).toBe('initializing');

    const second = registry.initialize('archive');

    await Promise.all([first, second]);

    expect(initialize).toHaveBeenCalledTimes(1);
    expect(registry.getStatus('archive')).toBe('ready');
  });

  it('isolates a failed initializer without rejecting the caller contract', async () => {
    const registry = new ProviderRegistry();
    registry.register(
      createFakeProvider({
        id: 'broken',
        initialize: async () => {
          throw createAppError('provider-unavailable', 'Upstream refused the connection.');
        },
      }),
    );

    await expect(registry.initialize('broken')).resolves.toBe('failed');

    const health = registry.getHealth('broken');

    expect(health.status).toBe('failed');
    expect(health.available).toBe(false);
    expect(health.lastError?.kind).toBe('provider-unavailable');
  });

  it('allows a failed provider to be initialized again', async () => {
    const registry = new ProviderRegistry();
    let shouldFail = true;

    registry.register(
      createFakeProvider({
        id: 'flaky',
        initialize: async () => {
          if (shouldFail) {
            throw new Error('Not ready yet.');
          }
        },
      }),
    );

    await expect(registry.initialize('flaky')).resolves.toBe('failed');

    shouldFail = false;

    await expect(registry.initialize('flaky')).resolves.toBe('ready');
  });

  it('initializes every provider independently, so one failure cannot block the rest', async () => {
    const registry = new ProviderRegistry();
    registry.register(
      createFakeProvider({
        id: 'bad',
        initialize: async () => {
          throw new Error('Cannot start.');
        },
      }),
    );
    registry.register(createFakeProvider({ id: 'good' }));

    const statuses = await registry.initializeAll();

    expect(statuses.get('bad')).toBe('failed');
    expect(statuses.get('good')).toBe('ready');
    expect(registry.getHealth('good').available).toBe(true);
  });
});

describe('health', () => {
  it('becomes unavailable after the consecutive failure threshold', () => {
    const clock = createClock();
    const registry = new ProviderRegistry({ now: clock.now });
    registry.register(createFakeProvider({ id: 'archive' }));

    for (let index = 0; index < DEFAULT_FAILURE_THRESHOLD - 1; index += 1) {
      registry.recordFailure('archive', createAppError('network', 'Offline.'));
    }

    expect(registry.getHealth('archive').available).toBe(true);

    registry.recordFailure('archive', createAppError('network', 'Offline.'));

    const health = registry.getHealth('archive');
    expect(health.available).toBe(false);
    expect(health.consecutiveFailures).toBe(DEFAULT_FAILURE_THRESHOLD);
    expect(health.lastError?.kind).toBe('network');
    expect(health.lastFailureAt).toBe(1_000);
  });

  it('recovers availability as soon as a request succeeds', () => {
    const clock = createClock();
    const registry = new ProviderRegistry({ now: clock.now, failureThreshold: 1 });
    registry.register(createFakeProvider({ id: 'archive' }));

    registry.recordFailure('archive', createAppError('network', 'Offline.'));
    expect(registry.getHealth('archive').available).toBe(false);

    clock.advance(500);
    registry.recordSuccess('archive');

    const health = registry.getHealth('archive');
    expect(health.available).toBe(true);
    expect(health.consecutiveFailures).toBe(0);
    expect(health.lastError).toBeUndefined();
    expect(health.lastSuccessAt).toBe(1_500);
  });

  it('clears a failed status when a request later succeeds', async () => {
    const registry = new ProviderRegistry();
    registry.register(
      createFakeProvider({
        id: 'archive',
        initialize: async () => {
          throw new Error('Nope.');
        },
      }),
    );

    await registry.initialize('archive');
    expect(registry.getStatus('archive')).toBe('failed');

    registry.recordSuccess('archive');

    expect(registry.getStatus('archive')).toBe('ready');
  });

  it('stays unavailable while the provider is disabled, regardless of health', () => {
    const registry = new ProviderRegistry();
    registry.register(createFakeProvider({ id: 'archive' }));

    registry.recordSuccess('archive');
    registry.setEnabled('archive', false);

    expect(registry.getHealth('archive')).toMatchObject({ enabled: false, available: false });
  });

  it('uses the probe result when a provider implements checkHealth', async () => {
    const registry = new ProviderRegistry();
    let healthy = false;

    registry.register(
      createFakeProvider({
        id: 'archive',
        checkHealth: async () => healthy,
      }),
    );

    expect((await registry.checkHealth('archive')).available).toBe(false);

    healthy = true;

    expect((await registry.checkHealth('archive')).available).toBe(true);
  });

  it('records a throwing probe as a failure instead of propagating it', async () => {
    const registry = new ProviderRegistry();
    registry.register(
      createFakeProvider({
        id: 'archive',
        checkHealth: async () => {
          throw new Error('Probe exploded.');
        },
      }),
    );

    const health = await registry.checkHealth('archive');

    expect(health.consecutiveFailures).toBe(1);
    expect(health.lastError).toBeDefined();
  });

  it('reports health for every provider', () => {
    const registry = new ProviderRegistry();
    registry.register(createFakeProvider({ id: 'a' }));
    registry.register(createFakeProvider({ id: 'b' }));

    expect(registry.listHealth().map((entry) => entry.id)).toEqual(['a', 'b']);
  });
});

describe('subscriptions', () => {
  it('notifies subscribers of registration, enablement, and health changes', () => {
    const registry = new ProviderRegistry();
    const listener = vi.fn();
    const unsubscribe = registry.subscribe(listener);
    const provider = createFakeProvider({ id: 'archive' });

    registry.register(provider);
    expect(listener).toHaveBeenCalledTimes(1);

    registry.setEnabled('archive', false);
    expect(listener).toHaveBeenCalledTimes(2);

    registry.recordFailure('archive', createAppError('network', 'Offline.'));
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    registry.setEnabled('archive', true);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('does not change state when the value is already what was asked for', () => {
    const registry = new ProviderRegistry();
    registry.register(createFakeProvider({ id: 'archive' }));

    const listener = vi.fn();
    registry.subscribe(listener);

    registry.setEnabled('archive', true);

    expect(listener).not.toHaveBeenCalled();
  });

  it('keeps notifying other subscribers when one throws', () => {
    const registry = new ProviderRegistry();
    const healthyListener = vi.fn();

    registry.subscribe(() => {
      throw new Error('Broken subscriber.');
    });
    registry.subscribe(healthyListener);

    expect(() => registry.register(createFakeProvider({ id: 'archive' }))).not.toThrow();
    expect(healthyListener).toHaveBeenCalled();
  });
});

describe('provider catalogue consistency', () => {
  it('uses unique ids that the registry accepts', () => {
    const ids = PROVIDER_CATALOG.map((entry) => entry.id);

    expect(new Set(ids).size).toBe(ids.length);

    // The catalogue is presentation metadata, but its ids become provider ids in routes,
    // canonical identities, and registrations. A typo here would not fail until Phase 4.
    const registry = new ProviderRegistry();

    for (const entry of PROVIDER_CATALOG) {
      registry.register(createFakeProvider({ id: entry.id }));
    }

    expect(registry.ids()).toEqual(ids);
  });
});
