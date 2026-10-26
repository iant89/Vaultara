import { describe, expect, it } from 'vitest';
import { ARCHIVE_MAX_RESULTS, ARCHIVE_RELATED_LIMIT, createArchiveProvider } from './adapter';
import {
  CATEGORY_COLLECTIONS_RESPONSE,
  COLLECTION_METADATA_RESPONSE,
  COUNT_RESPONSE,
  DARK_RESPONSE,
  EMPTY_RESPONSE,
  ITEM_RESPONSE,
  LENDING_RESPONSE,
  MALFORMED_SEARCH_RESPONSE,
  NO_DOWNLOAD_RESPONSE,
  SEARCH_RESPONSE,
  UNKNOWN_ITEM_RESPONSE,
  createFetchStub,
  jsonResponse,
  requestUrl,
  type FetchHandler,
  type FetchStub,
} from './fixtures';

const METADATA_BODIES: Readonly<Record<string, unknown>> = {
  nosferatu: ITEM_RESPONSE,
  lendingbook: LENDING_RESPONSE,
  nodownload_item: NO_DOWNLOAD_RESPONSE,
  darkitem: DARK_RESPONSE,
  feature_films: COLLECTION_METADATA_RESPONSE,
  solo: { metadata: { identifier: 'solo', title: 'Solo Record', mediatype: 'texts' } },
};

function createProvider(handler: FetchHandler): {
  provider: ReturnType<typeof createArchiveProvider>;
  stub: FetchStub;
} {
  const stub = createFetchStub(handler);

  return { provider: createArchiveProvider({ fetchImpl: stub.fetcher }), stub };
}

/** Answers metadata per identifier and every search with the same fixture. */
function createRoutedProvider(searchBody: unknown = SEARCH_RESPONSE) {
  return createProvider((url) => {
    const parsed = new URL(url);

    if (parsed.pathname === '/advancedsearch.php') {
      return jsonResponse(searchBody);
    }

    const identifier = decodeURIComponent(parsed.pathname.replace('/metadata/', ''));

    return jsonResponse(METADATA_BODIES[identifier] ?? UNKNOWN_ITEM_RESPONSE);
  });
}

describe('capabilities', () => {
  it('advertises only what the adapter implements', () => {
    const { provider } = createProvider(() => jsonResponse(EMPTY_RESPONSE));
    const capabilities = provider.getCapabilities();

    expect(provider.id).toBe('archive');
    expect(provider.name).toBe('Internet Archive');
    expect(provider.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(capabilities).toMatchObject({
      search: true,
      categories: true,
      collections: true,
      itemDetails: true,
      relatedContent: true,
      downloadableFiles: true,
      pagination: true,
      // Nothing is played through the application; files are linked instead.
      streaming: false,
      adultContent: false,
    });
    expect(capabilities.contentTypes).toContain('document');
    expect(capabilities.contentTypes).not.toContain('book');
  });

  it('answers a health probe with a minimal indexed lookup', async () => {
    const { provider, stub } = createProvider(() => jsonResponse(SEARCH_RESPONSE));

    await expect(provider.checkHealth()).resolves.toBe(true);

    const url = requestUrl(stub);

    expect(url.searchParams.get('q')).toBe('identifier:archive');
    expect(url.searchParams.get('rows')).toBe('1');
  });
});

describe('search', () => {
  it('returns a normalized page with a real total', async () => {
    const { provider, stub } = createRoutedProvider();

    const result = await provider.search('vampire');

    expect(result.items.map((item) => item.id)).toEqual(['nosferatu', 'gutenberg_alice']);
    expect(result).toMatchObject({ page: 1, pageSize: 24, total: 1284, hasMore: true });

    const url = requestUrl(stub);

    expect(url.searchParams.get('q')).toBe('vampire');
    expect(url.searchParams.get('page')).toBe('1');
    expect(url.searchParams.get('rows')).toBe('24');
  });

  it('requests the page the caller asked for', async () => {
    const { provider, stub } = createRoutedProvider();

    const result = await provider.search('vampire', { page: 3, pageSize: 10 });

    expect(result.page).toBe(3);
    expect(requestUrl(stub).searchParams.get('page')).toBe('3');
    expect(requestUrl(stub).searchParams.get('rows')).toBe('10');
  });

  it('escapes query syntax so a search term cannot become a field query', async () => {
    const { provider, stub } = createRoutedProvider();

    await provider.search('mediatype:movies AND (x)');

    expect(requestUrl(stub).searchParams.get('q')).toBe('mediatype\\:movies AND \\(x\\)');
  });

  it('binds the user query so an operator cannot escape a content-type filter', async () => {
    const { provider, stub } = createRoutedProvider();

    await provider.search('cats OR dogs', { contentTypes: ['book', 'audio'] });

    expect(requestUrl(stub).searchParams.get('q')).toBe(
      '(cats OR dogs) AND mediatype:(texts OR audio OR etree)',
    );
  });

  it('searches by content type alone when there is no text', async () => {
    const { provider, stub } = createRoutedProvider();

    await provider.search('   ', { contentTypes: ['movie'] });

    expect(requestUrl(stub).searchParams.get('q')).toBe('mediatype:(movies)');
  });

  it('makes no request for an empty unfiltered query', async () => {
    const { provider, stub } = createRoutedProvider();

    const result = await provider.search('   ');

    expect(result.items).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(stub.requests).toHaveLength(0);
  });

  it('maps the shared sort options onto Archive sort expressions', async () => {
    const { provider, stub } = createRoutedProvider();

    await provider.search('film', { sort: 'title-asc' });
    expect(requestUrl(stub).searchParams.getAll('sort[]')).toEqual(['titleSorter asc']);

    await provider.search('film', { sort: 'date-desc' });
    expect(requestUrl(stub, 1).searchParams.getAll('sort[]')).toEqual(['date desc']);

    await provider.search('film', { sort: 'relevance' });
    expect(requestUrl(stub, 2).searchParams.getAll('sort[]')).toEqual([]);
  });

  it('clamps an oversized page size rather than asking for thousands of rows', async () => {
    const { provider, stub } = createRoutedProvider();

    await provider.search('film', { pageSize: 5_000 });

    expect(requestUrl(stub).searchParams.get('rows')).toBe('100');
  });

  it('reports the 10,000-result ceiling as the total', async () => {
    const { provider } = createRoutedProvider({
      response: { numFound: 25_000, docs: SEARCH_RESPONSE.response.docs },
    });

    const result = await provider.search('film');

    expect(result.total).toBe(ARCHIVE_MAX_RESULTS);
  });

  it('stops paging at the ceiling instead of requesting results that cannot exist', async () => {
    const { provider, stub } = createRoutedProvider();

    const result = await provider.search('film', { page: 418, pageSize: 24 });

    expect(result).toMatchObject({ items: [], hasMore: false });
    expect(stub.requests).toHaveLength(0);
  });

  it('reports the last page before the ceiling as having no more results', async () => {
    const docs = Array.from({ length: 16 }, (_, index) => ({
      identifier: `item-${index}`,
      title: `Item ${index}`,
      mediatype: 'movies',
    }));
    const { provider } = createRoutedProvider({ response: { numFound: 25_000, docs } });

    const result = await provider.search('film', { page: 417, pageSize: 24 });

    expect(result.total).toBe(ARCHIVE_MAX_RESULTS);
    expect(result.hasMore).toBe(false);
  });

  it('skips documents that cannot describe an item', async () => {
    const { provider } = createRoutedProvider({
      response: {
        numFound: 3,
        docs: [null, { title: 'No identifier' }, { identifier: 'ok', title: 'Fine' }],
      },
    });

    const result = await provider.search('film');

    expect(result.items.map((item) => item.id)).toEqual(['ok']);
  });

  it('rejects a response with no document list', async () => {
    const { provider } = createRoutedProvider(MALFORMED_SEARCH_RESPONSE);

    await expect(provider.search('film')).rejects.toMatchObject({
      kind: 'invalid-response',
      providerId: 'archive',
    });
  });

  it('treats a complete absence of a response body as invalid', async () => {
    const { provider } = createRoutedProvider(EMPTY_RESPONSE);

    await expect(provider.search('film')).rejects.toMatchObject({ kind: 'invalid-response' });
  });

  it('surfaces a rate limit with the delay the provider asked for', async () => {
    const { provider } = createProvider(() =>
      jsonResponse({}, { status: 429, headers: { 'Retry-After': '12' } }),
    );

    await expect(provider.search('film')).rejects.toMatchObject({
      kind: 'rate-limited',
      retryAfterMs: 12_000,
    });
  });

  it('surfaces a provider outage as unavailability rather than an empty page', async () => {
    const { provider } = createProvider(() => jsonResponse({}, { status: 503 }));

    await expect(provider.search('film')).rejects.toMatchObject({
      kind: 'provider-unavailable',
    });
  });
});

describe('categories', () => {
  it('lists the configured categories with usable artwork', async () => {
    const { provider, stub } = createRoutedProvider();

    const categories = await provider.getCategories();

    expect(categories.map((category) => category.id)).toEqual([
      'movies',
      'texts',
      'audio',
      'images',
      'software',
      'data',
      'web',
    ]);
    for (const category of categories) {
      expect(category.providerId).toBe('archive');
      expect(category.name.length).toBeGreaterThan(0);
      expect(category.artworkUrl).toMatch(/^https:\/\/archive\.org\/services\/img\//);
    }
    // Configuration, not remote state: listing categories costs no request.
    expect(stub.requests).toHaveLength(0);
  });

  it('refuses to answer once the caller has cancelled', async () => {
    const { provider, stub } = createRoutedProvider();
    const controller = new AbortController();
    controller.abort();

    await expect(provider.getCategories({ signal: controller.signal })).rejects.toMatchObject({
      kind: 'cancelled',
    });
    expect(stub.requests).toHaveLength(0);
  });
});

describe('collections', () => {
  it('lists the collections filed under a media type', async () => {
    const { provider, stub } = createRoutedProvider(CATEGORY_COLLECTIONS_RESPONSE);

    const result = await provider.getCollections('movies');

    expect(result.items.map((collection) => collection.id)).toEqual(['feature_films', 'prelinger']);
    expect(result.items[0]).toMatchObject({
      title: 'Feature Films',
      description: 'Feature-length films.',
      sourceUrl: 'https://archive.org/details/feature_films',
      // The Archive writes the media type into every descendant's ancestry, so a collection is
      // placed in the interface's category without a second lookup.
      categoryIds: ['movies'],
    });
    expect(result).toMatchObject({ page: 1, total: 2, hasMore: false });

    const url = requestUrl(stub);

    expect(url.searchParams.get('q')).toBe('mediatype:collection AND collection:movies');
    expect(url.searchParams.getAll('sort[]')).toEqual(['downloads desc']);
  });

  it('pages with the provider’s own paging rather than slicing a local list', async () => {
    const { provider, stub } = createRoutedProvider(CATEGORY_COLLECTIONS_RESPONSE);

    await provider.getCollections('movies', { page: 3, pageSize: 10 });

    const url = requestUrl(stub);

    expect(url.searchParams.get('page')).toBe('3');
    expect(url.searchParams.get('rows')).toBe('10');
  });

  it('searches and orders the collection list when asked', async () => {
    const { provider, stub } = createRoutedProvider(CATEGORY_COLLECTIONS_RESPONSE);

    await provider.getCollections('movies', { sort: 'title-asc', query: 'film' });

    const url = requestUrl(stub);

    expect(url.searchParams.get('q')).toBe('(film) AND mediatype:collection AND collection:movies');
    expect(url.searchParams.getAll('sort[]')).toEqual(['titleSorter asc']);
  });

  it('places a nested collection under the media type it descends from', async () => {
    const { provider } = createRoutedProvider({
      response: {
        numFound: 1,
        docs: [
          {
            identifier: 'softwarelibrary_msdos_games',
            title: 'Software Library: MS-DOS Games',
            mediatype: 'collection',
            // The Archive lists the whole ancestor chain, media type included.
            collection: ['softwarelibrary', 'software', 'softwarelibrary_msdos_games'],
          },
        ],
      },
    });

    const result = await provider.getCollections('software');

    expect(result.items[0]?.categoryIds).toEqual(['software']);
  });

  it('reports a provider failure instead of pretending the category is empty', async () => {
    const { provider } = createProvider(() => jsonResponse({}, { status: 500 }));

    await expect(provider.getCollections('movies')).rejects.toMatchObject({
      kind: 'provider-unavailable',
    });
  });

  it('rejects a category this app does not offer', async () => {
    const { provider, stub } = createRoutedProvider();

    await expect(provider.getCollections('holograms')).rejects.toMatchObject({
      kind: 'not-found',
    });
    expect(stub.requests).toHaveLength(0);
  });

  it('lists the collections inside a collection', async () => {
    const { provider, stub } = createRoutedProvider(CATEGORY_COLLECTIONS_RESPONSE);

    const result = await provider.getSubcollections('softwarelibrary');

    expect(result.items.map((collection) => collection.id)).toEqual(['feature_films', 'prelinger']);
    expect(result).toMatchObject({ page: 1, total: 2 });

    expect(requestUrl(stub).searchParams.get('q')).toBe(
      'mediatype:collection AND collection:softwarelibrary',
    );
  });

  it('reports an empty page for a collection with no subcollections', async () => {
    const { provider } = createRoutedProvider({ response: { numFound: 0, docs: [] } });

    await expect(provider.getSubcollections('feature_films')).resolves.toMatchObject({
      items: [],
      hasMore: false,
      total: 0,
    });
  });

  it('requires an identifier before looking for subcollections', async () => {
    const { provider, stub } = createRoutedProvider();

    await expect(provider.getSubcollections('   ')).rejects.toMatchObject({ kind: 'not-found' });
    expect(stub.requests).toHaveLength(0);
  });

  it('reads a single collection with its item count', async () => {
    const { provider, stub } = createProvider((url) => {
      const parsed = new URL(url);

      if (parsed.pathname === '/advancedsearch.php') {
        expect(parsed.searchParams.get('rows')).toBe('0');
        expect(parsed.searchParams.get('q')).toBe('collection:feature_films');

        return jsonResponse(COUNT_RESPONSE);
      }

      return jsonResponse(COLLECTION_METADATA_RESPONSE);
    });

    const collection = await provider.getCollection('feature_films');

    expect(collection).toMatchObject({
      id: 'feature_films',
      title: 'Feature Films',
      itemCount: 4210,
    });
    expect(stub.requests).toHaveLength(2);
  });

  it('still returns a collection when its count cannot be read', async () => {
    const { provider } = createProvider((url) =>
      new URL(url).pathname === '/advancedsearch.php'
        ? jsonResponse({}, { status: 500 })
        : jsonResponse(COLLECTION_METADATA_RESPONSE),
    );

    const collection = await provider.getCollection('feature_films');

    expect(collection.itemCount).toBeUndefined();
    expect(collection.title).toBe('Feature Films');
  });

  it('rejects a collection the provider does not know', async () => {
    const { provider } = createRoutedProvider();

    await expect(provider.getCollection('missing_collection')).rejects.toMatchObject({
      kind: 'not-found',
    });
  });

  it('lists collection items with a stable order', async () => {
    const { provider, stub } = createRoutedProvider();

    const result = await provider.getCollectionItems('feature_films', { pageSize: 12 });

    expect(result.items).toHaveLength(2);

    const url = requestUrl(stub);

    expect(url.searchParams.get('q')).toBe('collection:feature_films AND -mediatype:collection');
    expect(url.searchParams.getAll('sort[]')).toEqual(['downloads desc']);
    expect(url.searchParams.get('rows')).toBe('12');
  });

  it('orders collection items when the caller asks for an order', async () => {
    const { provider, stub } = createRoutedProvider();

    await provider.getCollectionItems('feature_films', { sort: 'title-asc' });

    expect(requestUrl(stub).searchParams.getAll('sort[]')).toEqual(['titleSorter asc']);
  });

  it('searches inside a collection without escaping it', async () => {
    const { provider, stub } = createRoutedProvider();

    await provider.getCollectionItems('feature_films', { query: 'vampire OR (bat)' });

    // The user text stays inside its own group, so `OR` cannot widen the collection clause.
    expect(requestUrl(stub).searchParams.get('q')).toBe(
      '(vampire OR \\(bat\\)) AND collection:feature_films AND -mediatype:collection',
    );
  });

  it('filters collection items by content type', async () => {
    const { provider, stub } = createRoutedProvider();

    await provider.getCollectionItems('feature_films', { contentTypes: ['movie', 'document'] });

    expect(requestUrl(stub).searchParams.get('q')).toBe(
      'collection:feature_films AND -mediatype:collection AND mediatype:(movies OR texts)',
    );
  });

  it('ignores a blank collection search rather than narrowing to nothing', async () => {
    const { provider, stub } = createRoutedProvider();

    await provider.getCollectionItems('feature_films', { query: '   ' });

    expect(requestUrl(stub).searchParams.get('q')).toBe(
      'collection:feature_films AND -mediatype:collection',
    );
  });
});

describe('items', () => {
  it('returns a normalized item including file and size counts', async () => {
    const { provider } = createRoutedProvider();

    const item = await provider.getItem('nosferatu');

    expect(item).toMatchObject({
      id: 'nosferatu',
      providerId: 'archive',
      title: 'Nosferatu',
      type: 'movie',
      sourceUrl: 'https://archive.org/details/nosferatu',
    });
    expect(item.metadata).toMatchObject({ fileCount: 6, itemSize: 536870912 });
  });

  it('points every item at its Archive page for attribution', async () => {
    const { provider } = createRoutedProvider();

    const item = await provider.getItem('nosferatu');

    expect(item.sourceUrl).toBe('https://archive.org/details/nosferatu');
    expect(item.rights?.attributionUrl).toBe('https://archive.org/details/nosferatu');
    expect(item.thumbnailUrl).toBe('https://archive.org/services/img/nosferatu');
  });

  it('reports a withdrawn item as not available', async () => {
    const { provider } = createRoutedProvider();

    await expect(provider.getItem('darkitem')).rejects.toMatchObject({
      kind: 'not-found',
      message: expect.stringContaining('not publicly available'),
    });
  });

  it('reports an unknown identifier as missing, not as an empty item', async () => {
    const { provider } = createRoutedProvider();

    await expect(provider.getItem('nonexistent')).rejects.toMatchObject({ kind: 'not-found' });
  });

  it('reports a blank identifier as missing without a request', async () => {
    const { provider, stub } = createRoutedProvider();

    await expect(provider.getItem('  ')).rejects.toMatchObject({ kind: 'not-found' });
    expect(stub.requests).toHaveLength(0);
  });

  it('honours cancellation before dispatching', async () => {
    const { provider, stub } = createRoutedProvider();
    const controller = new AbortController();
    controller.abort();

    await expect(
      provider.getItem('nosferatu', { signal: controller.signal }),
    ).rejects.toMatchObject({ kind: 'cancelled' });
    expect(stub.requests).toHaveLength(0);
  });

  it('forwards the abort signal to the transport', async () => {
    const { provider, stub } = createRoutedProvider();
    const controller = new AbortController();

    await provider.getItem('nosferatu', { signal: controller.signal });

    const [request] = stub.requests;

    expect(request?.signal).toBe(controller.signal);
  });
});

describe('related items', () => {
  it('uses the item’s collections and never returns the item itself', async () => {
    const { provider, stub } = createRoutedProvider();

    const result = await provider.getRelatedItems('nosferatu');

    expect(result.items.map((item) => item.id)).toEqual(['gutenberg_alice']);
    // The reported total excludes the item itself, which the collection query counts.
    expect(result).toMatchObject({ page: 1, pageSize: ARCHIVE_RELATED_LIMIT, total: 1283 });

    const url = requestUrl(stub, 1);

    expect(url.searchParams.get('q')).toBe('(collection:feature_films)');
    expect(url.searchParams.get('rows')).toBe(String(ARCHIVE_RELATED_LIMIT + 1));
  });

  it('asks the provider for the requested page so more can be added on demand', async () => {
    const { provider, stub } = createRoutedProvider();

    await provider.getRelatedItems('nosferatu', { page: 4, pageSize: 6 });

    const url = requestUrl(stub, 1);

    expect(url.searchParams.get('page')).toBe('4');
    expect(url.searchParams.get('rows')).toBe('7');
  });

  it('returns an empty page when the item belongs to no collection', async () => {
    const { provider, stub } = createRoutedProvider();

    await expect(provider.getRelatedItems('solo')).resolves.toMatchObject({
      items: [],
      hasMore: false,
      total: 0,
    });
    expect(stub.requests).toHaveLength(1);
  });

  it('reports a withdrawn item instead of pretending it has no relations', async () => {
    const { provider } = createRoutedProvider();

    await expect(provider.getRelatedItems('darkitem')).rejects.toMatchObject({
      kind: 'not-found',
    });
  });

  it('reports an unknown item instead of an empty page', async () => {
    const { provider } = createRoutedProvider();

    await expect(provider.getRelatedItems('nonexistent')).rejects.toMatchObject({
      kind: 'not-found',
    });
  });
});

describe('available files', () => {
  it('lists content files without administrative entries', async () => {
    const { provider } = createRoutedProvider();

    const files = await provider.getAvailableFiles('nosferatu');

    expect(files.map((file) => file.name)).toEqual([
      'nosferatu.mp4',
      'nosferatu_512kb.mp4',
      'nosferatu_thumb.jpg',
      'nosferatu.ogv',
    ]);
  });

  it('lists a lending scan’s files as declared but unavailable', async () => {
    const { provider } = createRoutedProvider();

    const files = await provider.getAvailableFiles('lendingbook');

    expect(files).toHaveLength(3);
    expect(files.every((file) => !file.downloadAvailable)).toBe(true);
    expect(files[0]?.accessStatus).toBe('lending-restricted');
  });

  it('marks files unavailable when the provider forbids downloading', async () => {
    const { provider } = createRoutedProvider();

    const [file] = await provider.getAvailableFiles('nodownload_item');

    expect(file?.downloadAvailable).toBe(false);
    expect(file?.accessStatus).toBe('download-restricted');
  });

  it('refuses to list files for a withdrawn item', async () => {
    const { provider } = createRoutedProvider();

    await expect(provider.getAvailableFiles('darkitem')).rejects.toMatchObject({
      kind: 'not-found',
    });
  });
});

describe('download urls', () => {
  it('resolves a real file to its download URL', async () => {
    const { provider } = createRoutedProvider();

    await expect(provider.getDownloadUrl('nosferatu', 'nosferatu.mp4')).resolves.toBe(
      'https://archive.org/download/nosferatu/nosferatu.mp4',
    );
  });

  it('encodes file names that contain spaces or slashes', async () => {
    const { provider } = createProvider((url) =>
      new URL(url).pathname === '/advancedsearch.php'
        ? jsonResponse(EMPTY_RESPONSE)
        : jsonResponse({
            metadata: { identifier: 'item', title: 'Item' },
            files: [{ name: 'a b.mp3', source: 'original', format: 'VBR MP3' }],
          }),
    );

    await expect(provider.getDownloadUrl('item', 'a b.mp3')).resolves.toBe(
      'https://archive.org/download/item/a%20b.mp3',
    );
  });

  it('returns null for an unknown file, an empty id, or a restricted item', async () => {
    const { provider, stub } = createRoutedProvider();

    await expect(provider.getDownloadUrl('nosferatu', 'nope.mp4')).resolves.toBeNull();
    await expect(provider.getDownloadUrl('nosferatu', '   ')).resolves.toBeNull();
    await expect(provider.getDownloadUrl('lendingbook', 'lendingbook.pdf')).resolves.toBeNull();
    await expect(provider.getDownloadUrl('nodownload_item', 'track.mp3')).resolves.toBeNull();
    await expect(provider.getDownloadUrl('darkitem', 'page.jpg')).resolves.toBeNull();

    // The blank identifier is rejected without touching the network; the others each need to
    // inspect the item's files.
    expect(stub.requests).toHaveLength(4);
  });
});
