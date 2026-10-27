import { describe, expect, it } from 'vitest';
import { ADULT_ARCHIVE_COLLECTION_ID, ADULT_PROVIDER_ID } from '../../config/adult';
import {
  ADULT_ITEM_RESPONSE,
  EMPTY_RESPONSE,
  ITEM_RESPONSE,
  SEARCH_RESPONSE,
  UNKNOWN_ITEM_RESPONSE,
  createFetchStub,
  jsonResponse,
  requestUrl,
  type FetchHandler,
} from '../archive/fixtures';
import { createAdultProvider } from './adapter';

function createProvider(handler: FetchHandler) {
  const stub = createFetchStub(handler);

  return { provider: createAdultProvider({ fetchImpl: stub.fetcher }), stub };
}

function createRoutedProvider() {
  return createProvider((url) => {
    const parsed = new URL(url);

    if (parsed.pathname === '/advancedsearch.php') {
      return jsonResponse(SEARCH_RESPONSE);
    }

    const identifier = decodeURIComponent(parsed.pathname.replace('/metadata/', ''));

    if (identifier === 'adult_example') {
      return jsonResponse(ADULT_ITEM_RESPONSE);
    }

    if (identifier === 'nosferatu') {
      return jsonResponse(ITEM_RESPONSE);
    }

    return jsonResponse(UNKNOWN_ITEM_RESPONSE);
  });
}

describe('Adult adapter', () => {
  it('advertises an independent adult-content identity', () => {
    const { provider } = createProvider(() => jsonResponse(EMPTY_RESPONSE));

    expect(provider.id).toBe(ADULT_PROVIDER_ID);
    expect(provider.name).toBe('Adult');
    expect(provider.getCapabilities()).toMatchObject({
      search: true,
      adultContent: true,
      itemDetails: true,
    });
  });

  it('scopes every search to the adults-only collection, including an empty query', async () => {
    const { provider, stub } = createRoutedProvider();

    await provider.search('vampire');
    await provider.search('   ');

    expect(requestUrl(stub).searchParams.get('q')).toBe(
      `(vampire) AND -mediatype:collection AND collection:${ADULT_ARCHIVE_COLLECTION_ID}`,
    );
    expect(requestUrl(stub, 1).searchParams.get('q')).toBe(
      `-mediatype:collection AND collection:${ADULT_ARCHIVE_COLLECTION_ID}`,
    );
  });

  it('returns adults-only items under the Adult identity', async () => {
    const { provider } = createRoutedProvider();

    const item = await provider.getItem('adult_example');

    expect(item).toMatchObject({
      id: 'adult_example',
      providerId: ADULT_PROVIDER_ID,
      title: 'Restricted Example',
    });
  });

  it('does not return an Archive item that is outside the adults-only collection', async () => {
    const { provider } = createRoutedProvider();

    await expect(provider.getItem('nosferatu')).rejects.toMatchObject({
      kind: 'not-found',
      providerId: ADULT_PROVIDER_ID,
    });
  });

  it('exposes virtual media-type collections without fetching the unrestricted movies tree', async () => {
    const { provider, stub } = createRoutedProvider();

    const collection = await provider.getCollection('movies');

    expect(collection).toMatchObject({
      id: 'movies',
      providerId: ADULT_PROVIDER_ID,
      title: 'Moving Images',
    });
    expect(stub.requests).toHaveLength(0);

    await provider.getCollectionItems('movies');

    expect(requestUrl(stub).searchParams.get('q')).toBe(
      `mediatype:movies AND -mediatype:collection AND collection:${ADULT_ARCHIVE_COLLECTION_ID}`,
    );
  });

  it('probes health against the adults-only collection rather than a general Archive identifier', async () => {
    const { provider, stub } = createProvider(() => jsonResponse(SEARCH_RESPONSE));

    expect(provider.checkHealth).toBeTypeOf('function');
    await expect(provider.checkHealth?.()).resolves.toBe(true);
    expect(requestUrl(stub).searchParams.get('q')).toBe(
      `collection:${ADULT_ARCHIVE_COLLECTION_ID}`,
    );
  });
});
