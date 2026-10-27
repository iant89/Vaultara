import { describe, expect, it } from 'vitest';
import { ProviderGateway } from '../providers/gateway';
import { ProviderRegistry } from '../providers/registry';
import { createFakeProvider } from '../test/fakeProvider';
import {
  contentTypesForSearch,
  listSearchableProviders,
  parseSearchCategoryParam,
} from './searchProviders';

function runtimeWith(providers: Parameters<typeof createFakeProvider>[0][]) {
  const registry = new ProviderRegistry();

  for (const provider of providers) {
    registry.register(createFakeProvider(provider));
  }

  return {
    registry,
    gateway: new ProviderGateway(registry, {
      retry: { maxAttempts: 1, baseDelayMs: 1, maxDelayMs: 1, jitterRatio: 0 },
      sleep: () => Promise.resolve(),
    }),
  };
}

describe('listSearchableProviders', () => {
  it('omits disabled providers and providers that cannot search', () => {
    const runtime = runtimeWith([
      { id: 'archive', name: 'Internet Archive' },
      { id: 'mute', name: 'Mute', capabilities: { search: false } },
    ]);

    expect(listSearchableProviders(runtime).map((provider) => provider.id)).toEqual(['archive']);
    expect(listSearchableProviders(runtime, ['archive']).map((provider) => provider.id)).toEqual(
      [],
    );
  });

  it('omits Adult from global search until it is explicitly included', () => {
    const runtime = runtimeWith([
      { id: 'archive', name: 'Internet Archive' },
      { id: 'adult', name: 'Adult' },
    ]);

    expect(listSearchableProviders(runtime).map((provider) => provider.id)).toEqual(['archive']);
    expect(
      listSearchableProviders(runtime, [], { includeAdult: true }).map((provider) => provider.id),
    ).toEqual(['archive', 'adult']);
  });
});

describe('parseSearchCategoryParam', () => {
  it('accepts discovery families and ignores unknown ids', () => {
    expect(parseSearchCategoryParam('movies')).toBe('movies');
    expect(parseSearchCategoryParam('not-a-family')).toBeUndefined();
    expect(parseSearchCategoryParam('')).toBeUndefined();
  });
});

describe('contentTypesForSearch', () => {
  it('prefers an explicit type over a category family', () => {
    expect(contentTypesForSearch({ type: 'document', categoryId: 'movies' })).toEqual(['document']);
    expect(contentTypesForSearch({ categoryId: 'movies' })).toEqual(['movie', 'video']);
    expect(contentTypesForSearch({})).toBeUndefined();
  });
});
