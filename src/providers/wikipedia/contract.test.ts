/**
 * Wikipedia adapter through the real registry and gateway.
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
import { createWikipediaProvider } from './adapter';
import { SEARCH_PAGES, createFetchStub, jsonResponse, type FetchHandler } from './fixtures';

const TEST_RETRY = { maxAttempts: 2, baseDelayMs: 10, maxDelayMs: 50, jitterRatio: 0 };

function compose(handler: FetchHandler) {
  const stub = createFetchStub(handler);
  const registry = new ProviderRegistry();
  registry.register(createWikipediaProvider({ fetchImpl: stub.fetcher }));

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

describe('Wikipedia contract through the gateway', () => {
  it('returns validated articles for a search', async () => {
    const { gateway } = compose(() => jsonResponse(SEARCH_PAGES));
    const result = await gateway.search('wikipedia', 'Ada');

    expect(result.items[0]?.providerId).toBe('wikipedia');
    expect(result.items[0]?.type).toBe('article');
  });

  it('does not let a Wikipedia outage hide Archive search results', async () => {
    const wikiStub = createFetchStub(() => jsonResponse({}, { status: 503 }));
    const archive = archiveStub(() => archiveJson(ARCHIVE_SEARCH));
    const registry = new ProviderRegistry();

    registry.register(createArchiveProvider({ fetchImpl: archive.fetcher }));
    registry.register(createWikipediaProvider({ fetchImpl: wikiStub.fetcher }));

    const gateway = new ProviderGateway(registry, {
      defaultTimeoutMs: 1_000,
      retry: TEST_RETRY,
      sleep: () => Promise.resolve(),
      random: () => 0.5,
    });

    const archiveResult = await gateway.search('archive', 'vampire');
    const wikiError = await captureError(gateway.search('wikipedia', 'Ada'));

    expect(archiveResult.items.length).toBeGreaterThan(0);
    expect(wikiError.kind).toBe('provider-unavailable');
    expect(wikiError.providerId).toBe('wikipedia');
  });
});
