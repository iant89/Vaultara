import { describe, expect, it } from 'vitest';
import { createFakeProvider } from '../test/fakeProvider';
import {
  createProviderRuntime,
  defaultProviderFactories,
  getProviderRuntime,
  resetProviderRuntime,
} from './composition';
import { SEARCH_RESPONSE, createFetchStub, jsonResponse, requestUrl } from './archive/fixtures';

function archiveHandler() {
  return createFetchStub((url) =>
    new URL(url).pathname === '/advancedsearch.php'
      ? jsonResponse(SEARCH_RESPONSE)
      : jsonResponse({}),
  );
}

describe('provider composition root', () => {
  it('registers the Archive provider and nothing else by default', () => {
    const runtime = createProviderRuntime();

    expect(runtime.registry.ids()).toEqual(['archive']);
    expect(runtime.registry.get('archive')?.name).toBe('Internet Archive');
  });

  it('routes application calls through the gateway to the adapter', async () => {
    const stub = archiveHandler();
    const runtime = createProviderRuntime({ archive: { fetchImpl: stub.fetcher } });

    const result = await runtime.gateway.search('archive', 'vampire');

    expect(result.items.length).toBeGreaterThan(0);
    expect(requestUrl(stub).searchParams.get('q')).toBe('vampire');
  });

  it('builds exactly one factory per default provider', () => {
    const factories = defaultProviderFactories();
    const ids = factories.map((factory) => factory().id);

    expect(ids).toEqual(['archive']);
  });

  it('accepts a replacement provider set', async () => {
    const runtime = createProviderRuntime({
      factories: [() => createFakeProvider({ id: 'fake', name: 'Fake' })],
    });

    expect(runtime.registry.ids()).toEqual(['fake']);
    await expect(runtime.gateway.search('fake', 'anything')).resolves.toBeDefined();
  });

  it('refuses two providers with the same id', () => {
    const factory = () => createFakeProvider({ id: 'fake' });

    expect(() => createProviderRuntime({ factories: [factory, factory] })).toThrow(
      /already registered/,
    );
  });

  it('creates the shared runtime once and rebuilds it after a reset', () => {
    const first = getProviderRuntime();

    expect(getProviderRuntime()).toBe(first);

    resetProviderRuntime();

    const second = getProviderRuntime();

    expect(second).not.toBe(first);
    expect(second.registry.ids()).toEqual(['archive']);

    // Leave no shared runtime behind for other test files.
    resetProviderRuntime();
  });
});
