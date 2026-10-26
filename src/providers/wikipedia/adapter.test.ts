import { describe, expect, it } from 'vitest';
import { createWikipediaProvider } from './adapter';
import {
  CATEGORY_INFO,
  CATEGORY_MEMBERS,
  MEDIAWIKI_ERROR,
  MISSING_PAGE,
  MOST_VIEWED,
  SEARCH_PAGES,
  createFetchStub,
  jsonResponse,
  requestUrl,
  type FetchHandler,
  type FetchStub,
} from './fixtures';

function createProvider(handler: FetchHandler): {
  provider: ReturnType<typeof createWikipediaProvider>;
  stub: FetchStub;
} {
  const stub = createFetchStub(handler);

  return { provider: createWikipediaProvider({ fetchImpl: stub.fetcher }), stub };
}

function routed(body: unknown = SEARCH_PAGES) {
  return createProvider((url) => {
    const parsed = new URL(url);
    const action = parsed.searchParams.get('action');
    const list = parsed.searchParams.get('list');

    if (list === 'mostviewed') {
      return jsonResponse(MOST_VIEWED);
    }

    if (list === 'categorymembers') {
      return jsonResponse(CATEGORY_MEMBERS);
    }

    if (parsed.searchParams.get('titles')?.startsWith('Category:')) {
      return jsonResponse(CATEGORY_INFO);
    }

    if (parsed.searchParams.get('titles') === 'Not A Real Article') {
      return jsonResponse(MISSING_PAGE);
    }

    if (action === 'query') {
      return jsonResponse(body);
    }

    return jsonResponse({}, { status: 404 });
  });
}

describe('Wikipedia adapter', () => {
  it('advertises article search, categories, and related content', () => {
    const { provider } = createProvider(() => jsonResponse(SEARCH_PAGES));
    const capabilities = provider.getCapabilities();

    expect(provider.id).toBe('wikipedia');
    expect(provider.name).toBe('Wikipedia');
    expect(capabilities).toMatchObject({
      search: true,
      categories: true,
      collections: true,
      itemDetails: true,
      relatedContent: true,
      downloadableFiles: true,
      subcollections: true,
      streaming: false,
      adultContent: false,
    });
    expect(capabilities.contentTypes).toEqual(['article']);
  });

  it('searches with generator=search and origin=*', async () => {
    const { provider, stub } = routed();
    const result = await provider.search('Ada');

    expect(result.items[0]?.title).toBe('Ada Lovelace');
    expect(result.items[0]?.type).toBe('article');
    expect(requestUrl(stub).searchParams.get('origin')).toBe('*');
    expect(requestUrl(stub).searchParams.get('generator')).toBe('search');
    expect(requestUrl(stub).searchParams.get('gsrsearch')).toBe('Ada');
  });

  it('treats an empty query as most-viewed articles, not the whole encyclopaedia', async () => {
    const { provider, stub } = routed();
    const result = await provider.search('');

    expect(result.items.map((item) => item.id)).toEqual(['Ada_Lovelace', 'Charles_Babbage']);
    expect(requestUrl(stub).searchParams.get('list')).toBe('mostviewed');
  });

  it('returns an empty page when the caller asked for a type Wikipedia does not have', async () => {
    const { provider, stub } = routed();
    const result = await provider.search('Ada', { contentTypes: ['movie'] });

    expect(result.items).toEqual([]);
    expect(stub.requests).toEqual([]);
  });

  it('loads an article with licence, source, and language links', async () => {
    const { provider } = routed();
    const item = await provider.getItem('Ada_Lovelace');

    expect(item.title).toBe('Ada Lovelace');
    expect(item.rights?.license).toContain('creativecommons.org');
    expect(item.sourceUrl).toBe('https://en.wikipedia.org/wiki/Ada_Lovelace');
    expect(item.metadata['langlinks']).toEqual([
      {
        lang: 'it',
        title: 'Ada Lovelace',
        url: 'https://it.wikipedia.org/wiki/Ada_Lovelace',
      },
    ]);
  });

  it('reports a missing article as not-found', async () => {
    const { provider } = routed();

    await expect(provider.getItem('Not A Real Article')).rejects.toMatchObject({
      kind: 'not-found',
    });
  });

  it('lists configured categories without a network request', async () => {
    const { provider, stub } = routed();
    const categories = await provider.getCategories();

    expect(categories.some((category) => category.id === 'Science')).toBe(true);
    expect(categories.every((category) => category.providerId === 'wikipedia')).toBe(true);
    expect(stub.requests).toEqual([]);
  });

  it('lists subcategories of a subject as collections', async () => {
    const { provider } = routed();
    const collections = await provider.getCollections('Science');

    expect(collections.items.map((entry) => entry.id)).toEqual(['Physics', 'Biology']);
    expect(collections.hasMore).toBe(true);
  });

  it('loads a Wikipedia category as a collection', async () => {
    const { provider } = routed();
    const collection = await provider.getCollection('Science');

    expect(collection.title).toBe('Science');
    expect(collection.itemCount).toBe(12);
    expect(collection.sourceUrl).toContain('Category:Science');
  });

  it('offers one synthetic article file that opens the original page', async () => {
    const { provider } = routed();
    const files = await provider.getAvailableFiles('Ada_Lovelace');

    expect(files).toHaveLength(1);
    expect(files[0]?.mimeType).toBe('application/vnd.vaultara.wikipedia+html');
    expect(files[0]?.downloadUrl).toBe('https://en.wikipedia.org/wiki/Ada_Lovelace');
  });

  it('asks for related articles with morelike', async () => {
    const { provider, stub } = routed();

    await provider.getRelatedItems('Ada_Lovelace');

    expect(requestUrl(stub).searchParams.get('gsrsearch')).toBe('morelike:Ada Lovelace');
  });

  it('surfaces a MediaWiki error as not-found rather than an empty item', async () => {
    const { provider } = createProvider(() => jsonResponse(MEDIAWIKI_ERROR));

    await expect(provider.getItem('Missing')).rejects.toMatchObject({ kind: 'not-found' });
  });
});
