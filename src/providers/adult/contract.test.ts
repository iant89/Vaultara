/**
 * Adult adapter through the real registry and gateway.
 */

import { describe, expect, it } from 'vitest';
import type { AppError } from '../../models/errors';
import { ProviderGateway } from '../gateway';
import { ProviderRegistry } from '../registry';
import { createArchiveProvider } from '../archive/adapter';
import {
  SEARCH_RESPONSE as ARCHIVE_SEARCH,
  createFetchStub as archiveStub,
  jsonResponse as archiveJson,
} from '../archive/fixtures';
import { createAdultProvider } from './adapter';
import { createFetchStub, jsonResponse, type FetchHandler } from '../archive/fixtures';

const TEST_RETRY = { maxAttempts: 2, baseDelayMs: 10, maxDelayMs: 50, jitterRatio: 0 };

function compose(handler: FetchHandler) {
  const stub = createFetchStub(handler);
  const registry = new ProviderRegistry();
  registry.register(createAdultProvider({ fetchImpl: stub.fetcher }));

  const gateway = new ProviderGateway(registry, {
    defaultTimeoutMs: 1_000,
    retry: TEST_RETRY,
    sleep: () => Promise.resolve(),
    random: () => 0.5,
  });

  return { gateway, registry, stub };
}

async function captureError(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise;
  } catch (error) {
    return error as AppError;
  }

  throw new Error('Expected the call to fail.');
}

const ADULT_SEARCH = {
  response: {
    numFound: 1,
    docs: [
      {
        identifier: 'adult_example',
        title: 'Restricted Example',
        mediatype: 'movies',
        collection: ['adultsonly'],
      },
    ],
  },
};

describe('Adult contract through the gateway', () => {
  it('returns Adult-scoped search results', async () => {
    const { gateway } = compose(() => jsonResponse(ADULT_SEARCH));
    const result = await gateway.search('adult', 'vampire');

    expect(result.items[0]?.providerId).toBe('adult');
    expect(result.items[0]?.id).toBe('adult_example');
  });

  it('does not let an Adult outage hide Archive search results', async () => {
    const adultStub = createFetchStub(() => jsonResponse({}, { status: 503 }));
    const archive = archiveStub(() => archiveJson(ARCHIVE_SEARCH));
    const registry = new ProviderRegistry();

    registry.register(createArchiveProvider({ fetchImpl: archive.fetcher }));
    registry.register(createAdultProvider({ fetchImpl: adultStub.fetcher }));

    const gateway = new ProviderGateway(registry, {
      defaultTimeoutMs: 1_000,
      retry: TEST_RETRY,
      sleep: () => Promise.resolve(),
      random: () => 0.5,
    });

    const archiveResult = await gateway.search('archive', 'vampire');
    const adultError = await captureError(gateway.search('adult', 'vampire'));

    expect(archiveResult.items.length).toBeGreaterThan(0);
    expect(archiveResult.items[0]?.providerId).toBe('archive');
    expect(adultError.kind).toBe('provider-unavailable');
    expect(adultError.providerId).toBe('adult');
  });
});
