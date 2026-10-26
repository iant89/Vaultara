/**
 * The Archive adapter exercised through the real registry and gateway.
 *
 * The adapter's own tests prove the mapping; these prove the parts the application depends on:
 * that responses satisfy the shared contract after validation, that policy (retries, rate limits,
 * cancellation, capability gating) applies to a real adapter, and that health accounting recorded
 * by the registry reflects what the provider actually did.
 */

import { describe, expect, it } from 'vitest';
import type { AppError } from '../../models/errors';
import {
  createProviderCapabilities,
  type ContentProvider,
  type ProviderCapabilities,
} from '../../models/provider';
import { ProviderGateway } from '../gateway';
import { ProviderRegistry } from '../registry';
import { createArchiveProvider } from './adapter';
import {
  EMPTY_RESPONSE,
  ITEM_RESPONSE,
  SEARCH_RESPONSE,
  UNKNOWN_ITEM_RESPONSE,
  createFetchStub,
  jsonResponse,
  type FetchHandler,
} from './fixtures';

const TEST_RETRY = { maxAttempts: 2, baseDelayMs: 10, maxDelayMs: 50, jitterRatio: 0 };

/**
 * The same adapter with a narrower capability claim, built on the adapter's own prototype so its
 * methods keep working — spreading a class instance would copy fields but drop the methods.
 */
function withCapabilities(
  provider: ContentProvider,
  capabilities: Partial<ProviderCapabilities>,
): ContentProvider {
  const clone = Object.create(Object.getPrototypeOf(provider) as object) as ContentProvider;

  return Object.assign(clone, provider, {
    getCapabilities: () => createProviderCapabilities(capabilities),
  });
}

async function captureError(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise;
  } catch (error) {
    return error as AppError;
  }

  throw new Error('Expected the call to fail.');
}

function compose(
  handler: FetchHandler,
  registry?: ProviderRegistry,
  retry: typeof TEST_RETRY = TEST_RETRY,
) {
  const stub = createFetchStub(handler);
  const registryInstance = registry ?? new ProviderRegistry();
  registryInstance.register(createArchiveProvider({ fetchImpl: stub.fetcher }));

  const sleeps: number[] = [];
  const gateway = new ProviderGateway(registryInstance, {
    defaultTimeoutMs: 1_000,
    retry,
    sleep: (ms) => {
      sleeps.push(ms);

      return Promise.resolve();
    },
    random: () => 0.5,
  });

  return { gateway, registry: registryInstance, stub, sleeps };
}

const metadataHandler: FetchHandler = (url) => {
  const parsed = new URL(url);

  if (parsed.pathname === '/advancedsearch.php') {
    return jsonResponse(SEARCH_RESPONSE);
  }

  const identifier = decodeURIComponent(parsed.pathname.replace('/metadata/', ''));

  return jsonResponse(identifier === 'nosferatu' ? ITEM_RESPONSE : UNKNOWN_ITEM_RESPONSE);
};

describe('Archive provider through the gateway', () => {
  it('returns validated items from search', async () => {
    const { gateway } = compose(metadataHandler);

    const result = await gateway.search('archive', 'vampire');

    expect(result.total).toBe(1284);
    for (const item of result.items) {
      expect(item.providerId).toBe('archive');
      expect(Array.isArray(item.categories)).toBe(true);
      expect(Array.isArray(item.tags)).toBe(true);
    }
  });

  it('returns a validated item, its files, and a download URL', async () => {
    const { gateway } = compose(metadataHandler);

    const item = await gateway.getItem('archive', 'nosferatu');
    const files = await gateway.getAvailableFiles('archive', 'nosferatu');
    const url = await gateway.getDownloadUrl('archive', 'nosferatu', 'nosferatu.mp4');

    expect(item.id).toBe('nosferatu');
    expect(files.length).toBeGreaterThan(0);
    expect(files.every((file) => file.itemId === 'nosferatu')).toBe(true);
    expect(url).toBe('https://archive.org/download/nosferatu/nosferatu.mp4');
  });

  it('records a missing item as a request failure without breaking the provider', async () => {
    const { gateway, registry } = compose(metadataHandler);

    await expect(gateway.getItem('archive', 'nonexistent')).rejects.toMatchObject({
      kind: 'not-found',
      providerId: 'archive',
    });

    const health = registry.getHealth('archive');

    expect(health.status).not.toBe('failed');
    expect(health.available).toBe(true);
  });

  it('refuses an operation the provider has not declared', async () => {
    const registry = new ProviderRegistry();
    const archive = createArchiveProvider({ fetchImpl: createFetchStub(metadataHandler).fetcher });
    registry.register(withCapabilities(archive, { itemDetails: true }));

    const gateway = new ProviderGateway(registry, { retry: TEST_RETRY });

    await expect(gateway.search('archive', 'vampire')).rejects.toMatchObject({
      kind: 'unsupported-capability',
    });
  });

  it('retries a temporary provider failure and then succeeds', async () => {
    let attempts = 0;
    const { gateway, sleeps } = compose(() => {
      attempts += 1;

      return attempts === 1 ? jsonResponse({}, { status: 503 }) : jsonResponse(SEARCH_RESPONSE);
    });

    const result = await gateway.search('archive', 'vampire');

    expect(attempts).toBe(2);
    expect(result.items.length).toBeGreaterThan(0);
    expect(sleeps).toHaveLength(1);
  });

  it('honours the provider’s Retry-After delay instead of its own backoff', async () => {
    // The cap is raised above 7 s so the assertion is about which delay wins, not about clamping.
    const { gateway, sleeps } = compose(
      () => jsonResponse({}, { status: 429, headers: { 'Retry-After': '7' } }),
      undefined,
      { maxAttempts: 2, baseDelayMs: 10, maxDelayMs: 10_000, jitterRatio: 0 },
    );

    await expect(gateway.search('archive', 'vampire')).rejects.toMatchObject({
      kind: 'rate-limited',
      retryAfterMs: 7_000,
    });
    expect(sleeps).toEqual([7_000]);
  });

  it('stops calling a provider that keeps failing', async () => {
    let requests = 0;
    const registry = new ProviderRegistry({ failureThreshold: 1 });
    const { gateway } = compose(() => {
      requests += 1;

      return jsonResponse({}, { status: 500 });
    }, registry);

    await expect(gateway.search('archive', 'vampire')).rejects.toMatchObject({
      kind: 'provider-unavailable',
    });

    const afterFailure = requests;

    await expect(gateway.search('archive', 'vampire')).rejects.toMatchObject({
      kind: 'provider-unavailable',
      message: expect.stringContaining('temporarily unavailable'),
    });
    expect(requests).toBe(afterFailure);
  });

  it('treats cancellation as the caller’s decision, not a provider failure', async () => {
    const { gateway, registry, stub } = compose(metadataHandler);
    const controller = new AbortController();
    controller.abort();

    await expect(
      gateway.search('archive', 'vampire', { signal: controller.signal }),
    ).rejects.toMatchObject({ kind: 'cancelled' });

    const health = registry.getHealth('archive');

    expect(health.consecutiveFailures).toBe(0);
    expect(health.available).toBe(true);
    expect(stub.requests).toHaveLength(0);
  });

  it('does not retry a malformed response', async () => {
    let attempts = 0;
    const { gateway } = compose(() => {
      attempts += 1;

      return jsonResponse(EMPTY_RESPONSE);
    });

    await expect(gateway.search('archive', 'vampire')).rejects.toMatchObject({
      kind: 'invalid-response',
    });
    expect(attempts).toBe(1);
  });

  it('reports a health probe as a recorded success', async () => {
    const { registry } = compose(metadataHandler);

    const health = await registry.checkHealth('archive');

    // A probe answering successfully clears the failure streak and stamps a success time;
    // lifecycle status only moves to `ready` through initialization.
    expect(health.available).toBe(true);
    expect(health.consecutiveFailures).toBe(0);
    expect(health.lastSuccessAt).toBeTypeOf('number');
  });

  it('propagates provider attribution on every failure it raises', async () => {
    const { gateway } = compose(() => jsonResponse({}, { status: 403 }));

    const error = await captureError(gateway.search('archive', 'vampire'));

    expect(error.providerId).toBe('archive');
    expect(error.kind).toBe('unauthorized');
  });
});
