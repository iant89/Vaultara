import { describe, expect, it, vi } from 'vitest';
import { createAppError, type AppError } from '../models/errors';
import { createPaginatedResult } from '../models/pagination';
import { createFakeProvider, makeFile, makeItem } from '../test/fakeProvider';
import { ProviderGateway } from './gateway';
import { ProviderRegistry } from './registry';

const RETRY_ONCE = { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 5, jitterRatio: 0 };

function createGateway(
  providerOverrides: Parameters<typeof createFakeProvider>[0] = {},
  options: { failureThreshold?: number } = {},
): { registry: ProviderRegistry; gateway: ProviderGateway } {
  const registry = new ProviderRegistry({
    ...(options.failureThreshold !== undefined
      ? { failureThreshold: options.failureThreshold }
      : {}),
  });
  registry.register(createFakeProvider(providerOverrides));

  const gateway = new ProviderGateway(registry, {
    retry: RETRY_ONCE,
    sleep: async () => undefined,
    random: () => 0.5,
    defaultTimeoutMs: 50,
  });

  return { registry, gateway };
}

async function errorOf(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise;
  } catch (error) {
    return error as AppError;
  }

  throw new Error('Expected the call to reject, but it resolved.');
}

describe('guard rails before a request', () => {
  it('reports an unregistered provider as not-found', async () => {
    const { gateway } = createGateway();

    expect((await errorOf(gateway.search('nobody', 'query'))).kind).toBe('not-found');
  });

  it('refuses to call a disabled provider', async () => {
    const search = vi.fn(async () => createPaginatedResult([], { page: 1, pageSize: 24 }));
    const { registry, gateway } = createGateway({ id: 'adult', search });

    registry.setEnabled('adult', false);

    const error = await errorOf(gateway.search('adult', 'query'));

    expect(error.kind).toBe('provider-unavailable');
    expect(error.message).toMatch(/disabled/);
    expect(search).not.toHaveBeenCalled();
  });

  it('refuses an operation the provider has not declared', async () => {
    const getRelatedItems = vi.fn(async () => createPaginatedResult([], { page: 1, pageSize: 12 }));
    const { gateway } = createGateway({ capabilities: { relatedContent: false }, getRelatedItems });

    const error = await errorOf(gateway.getRelatedItems('fake', 'item-1'));

    expect(error.kind).toBe('unsupported-capability');
    expect(getRelatedItems).not.toHaveBeenCalled();
  });

  it('reports an unimplemented optional method as an unsupported capability', async () => {
    const { gateway } = createGateway({ capabilities: { downloadableFiles: true } });

    expect((await errorOf(gateway.getAvailableFiles('fake', 'item-1'))).kind).toBe(
      'unsupported-capability',
    );
    expect((await errorOf(gateway.getDownloadUrl('fake', 'item-1', 'file-1'))).kind).toBe(
      'unsupported-capability',
    );
  });

  it('stops calling a provider that has tripped the failure threshold', async () => {
    const search = vi.fn(async () => createPaginatedResult([], { page: 1, pageSize: 24 }));
    const { registry, gateway } = createGateway({ search }, { failureThreshold: 2 });

    for (let index = 0; index < 2; index += 1) {
      registry.recordFailure('fake', createAppError('network', 'Offline.'));
    }

    const error = await errorOf(gateway.search('fake', 'query'));

    expect(error.kind).toBe('provider-unavailable');
    expect(error.message).toMatch(/temporarily unavailable/);
    expect(search).not.toHaveBeenCalled();
  });
});

describe('successful calls', () => {
  it('returns a validated page and records the success', async () => {
    const page = createPaginatedResult([makeItem()], { page: 1, pageSize: 24, total: 1 });
    const { registry, gateway } = createGateway({ search: async () => page });

    registry.recordFailure('fake', createAppError('network', 'Earlier failure.'));

    const result = await gateway.search('fake', '  nosferatu  ');

    expect(result.items).toHaveLength(1);
    expect(registry.getHealth('fake')).toMatchObject({
      consecutiveFailures: 0,
      available: true,
    });
    expect(registry.getHealth('fake').lastSuccessAt).toBeTypeOf('number');
  });

  it('trims the query before handing it to the adapter', async () => {
    const search = vi.fn(async () => createPaginatedResult([], { page: 1, pageSize: 24 }));
    const { gateway } = createGateway({ search });

    await gateway.search('fake', '   silent film   ');

    expect(search).toHaveBeenCalledWith('silent film', expect.anything());
  });

  it('passes a cancellable signal to the adapter', async () => {
    const search = vi.fn(async (_query: string, options?: { signal?: AbortSignal }) =>
      createPaginatedResult(options?.signal === undefined ? [] : [], { page: 1, pageSize: 24 }),
    );
    const { gateway } = createGateway({ search });

    await gateway.search('fake', 'query');

    const passed = search.mock.calls[0]?.[1];
    expect(passed?.signal).toBeInstanceOf(AbortSignal);
  });

  it('returns an empty download URL without treating it as a failure', async () => {
    const { gateway } = createGateway({
      capabilities: { downloadableFiles: true },
      getDownloadUrl: async () => null,
    });

    await expect(gateway.getDownloadUrl('fake', 'item-1', 'file-1')).resolves.toBeNull();
  });

  it('returns files for a provider that exposes them', async () => {
    const { gateway } = createGateway({
      capabilities: { downloadableFiles: true },
      getAvailableFiles: async () => [makeFile()],
    });

    const files = await gateway.getAvailableFiles('fake', 'item-1');

    expect(files).toHaveLength(1);
  });
});

describe('malformed responses', () => {
  it('rejects a page that is not a page and records the failure', async () => {
    const { registry, gateway } = createGateway({
      search: async () => ({ nope: true }) as never,
    });

    const error = await errorOf(gateway.search('fake', 'query'));

    expect(error.kind).toBe('invalid-response');
    expect(error.providerId).toBe('fake');
    expect(registry.getHealth('fake').consecutiveFailures).toBe(1);
  });

  it('rejects an item with no id', async () => {
    const { gateway } = createGateway({ getItem: async () => ({}) as never });

    expect((await errorOf(gateway.getItem('fake', 'item-1'))).kind).toBe('invalid-response');
  });

  it('rejects a download URL that is not http(s)', async () => {
    const { gateway } = createGateway({
      capabilities: { downloadableFiles: true },
      getDownloadUrl: async () => 'javascript:alert(1)',
    });

    expect((await errorOf(gateway.getDownloadUrl('fake', 'item-1', 'file-1'))).kind).toBe(
      'invalid-response',
    );
  });

  it('rejects a promise that never resolves', async () => {
    const { gateway } = createGateway({ getItem: () => new Promise<never>(() => undefined) });

    expect((await errorOf(gateway.getItem('fake', 'item-1'))).kind).toBe('timeout');
  });
});

describe('retries and rate limits', () => {
  it('retries a transient failure and succeeds', async () => {
    let calls = 0;
    const { registry, gateway } = createGateway({
      search: async () => {
        calls += 1;

        if (calls === 1) {
          throw createAppError('network', 'Connection reset.');
        }

        return createPaginatedResult([makeItem()], { page: 1, pageSize: 24 });
      },
    });

    await expect(gateway.search('fake', 'query')).resolves.toBeDefined();

    expect(calls).toBe(2);
    expect(registry.getHealth('fake').consecutiveFailures).toBe(0);
  });

  it('does not retry a malformed response', async () => {
    let calls = 0;
    const { gateway } = createGateway({
      getItem: async () => {
        calls += 1;
        return {} as never;
      },
    });

    await errorOf(gateway.getItem('fake', 'item-1'));

    expect(calls).toBe(1);
  });

  it('waits for the provider-supplied rate-limit delay', async () => {
    const delays: number[] = [];
    const registry = new ProviderRegistry();
    registry.register(
      createFakeProvider({
        search: async () => {
          throw createAppError('rate-limited', 'Slow down.', { retryAfterMs: 1500 });
        },
      }),
    );

    const gateway = new ProviderGateway(registry, {
      retry: { maxAttempts: 2, baseDelayMs: 10, maxDelayMs: 5000, jitterRatio: 0 },
      sleep: async (ms) => {
        delays.push(ms);
      },
      random: () => 0.5,
      defaultTimeoutMs: 50,
    });

    const error = await errorOf(gateway.search('fake', 'query'));

    expect(delays).toEqual([1500]);
    expect(error.kind).toBe('rate-limited');
  });
});

describe('cancellation', () => {
  it('reports cancellation and does not count it against the provider', async () => {
    const controller = new AbortController();
    const { registry, gateway } = createGateway({
      search: async () => {
        controller.abort();
        return new Promise<never>(() => undefined);
      },
    });

    const error = await errorOf(gateway.search('fake', 'query', { signal: controller.signal }));

    expect(error.kind).toBe('cancelled');
    expect(registry.getHealth('fake').consecutiveFailures).toBe(0);
    expect(registry.getHealth('fake').available).toBe(true);
  });

  it('does not call a provider when the caller has already cancelled', async () => {
    const controller = new AbortController();
    controller.abort();
    const search = vi.fn(async () => createPaginatedResult([], { page: 1, pageSize: 24 }));
    const { gateway } = createGateway({ search });

    expect(
      (await errorOf(gateway.search('fake', 'query', { signal: controller.signal }))).kind,
    ).toBe('cancelled');
    expect(search).not.toHaveBeenCalled();
  });
});

describe('failure isolation', () => {
  it('keeps one provider working while another fails', async () => {
    const registry = new ProviderRegistry();
    registry.register(
      createFakeProvider({
        id: 'broken',
        getItem: async () => {
          throw createAppError('network', 'Offline.');
        },
      }),
    );
    registry.register(createFakeProvider({ id: 'healthy' }));

    const gateway = new ProviderGateway(registry, {
      retry: { maxAttempts: 1, baseDelayMs: 1, maxDelayMs: 1, jitterRatio: 0 },
      defaultTimeoutMs: 50,
    });

    await errorOf(gateway.getItem('broken', 'item-1'));

    await expect(gateway.getItem('healthy', 'item-1')).resolves.toMatchObject({
      providerId: 'healthy',
    });

    expect(registry.getHealth('broken').consecutiveFailures).toBe(1);
    expect(registry.getHealth('healthy').consecutiveFailures).toBe(0);
  });
});
