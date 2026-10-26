import { describe, expect, it, vi } from 'vitest';
import { createPaginatedResult } from '../models/pagination';
import { ProviderGateway } from '../providers/gateway';
import { ProviderRegistry } from '../providers/registry';
import { createFakeProvider, makeCollection, makeItem } from '../test/fakeProvider';
import { createContentQueries, type ContentQueries } from './contentQueries';
import { createRequestLimiter } from './requestLimiter';

const PAGE = createPaginatedResult([], { page: 1, pageSize: 24 });

function createHarness(limiter?: ReturnType<typeof createRequestLimiter>) {
  const getCategories = vi.fn(async () => []);
  const getCollections = vi.fn(async () => createPaginatedResult([], { page: 1, pageSize: 24 }));
  const getCollection = vi.fn(async () => makeCollection());
  const getCollectionItems = vi.fn(async () => PAGE);
  const getItem = vi.fn(async (itemId: string) => makeItem({ id: itemId }));
  const getRelatedItems = vi.fn(async () => [makeItem({ id: 'related' })]);
  const getAvailableFiles = vi.fn(async () => []);
  const search = vi.fn(async () => PAGE);

  const registry = new ProviderRegistry();
  registry.register(
    createFakeProvider({
      id: 'fake',
      getCategories,
      getCollections,
      getCollection,
      getCollectionItems,
      getItem,
      getRelatedItems,
      getAvailableFiles,
      search,
    }),
  );

  const gateway = new ProviderGateway(registry, {
    retry: { maxAttempts: 1, baseDelayMs: 1, maxDelayMs: 1, jitterRatio: 0 },
    sleep: () => Promise.resolve(),
  });

  const queries: ContentQueries = createContentQueries(gateway, {
    ...(limiter !== undefined ? { limiter } : {}),
  });

  return {
    queries,
    gateway,
    spies: {
      getCategories,
      getCollections,
      getCollection,
      getCollectionItems,
      getItem,
      getRelatedItems,
      getAvailableFiles,
      search,
    },
  };
}

describe('content queries', () => {
  it('passes paging, ordering, filtering, and text through to the provider', async () => {
    const { queries, spies } = createHarness();

    await queries.collectionItems('fake', 'classic-films', {
      page: 2,
      pageSize: 12,
      sort: 'title-asc',
      contentTypes: ['movie'],
      query: 'vampire',
    });

    expect(spies.getCollectionItems).toHaveBeenCalledWith(
      'classic-films',
      expect.objectContaining({
        page: 2,
        pageSize: 12,
        sort: 'title-asc',
        contentTypes: ['movie'],
        query: 'vampire',
      }),
    );
  });

  it('does not repeat an identical request', async () => {
    const { queries, spies } = createHarness();

    await queries.collectionItems('fake', 'classic-films', { page: 1 });
    await queries.collectionItems('fake', 'classic-films', { page: 1 });

    expect(spies.getCollectionItems).toHaveBeenCalledTimes(1);
  });

  it('keys the cache on every argument that changes the result', async () => {
    const { queries, spies } = createHarness();

    await queries.collectionItems('fake', 'classic-films', { page: 1 });
    await queries.collectionItems('fake', 'classic-films', { page: 2 });
    await queries.collectionItems('fake', 'classic-films', { page: 1, sort: 'date-desc' });
    await queries.collectionItems('fake', 'classic-films', { page: 1, contentTypes: ['movie'] });
    await queries.collectionItems('fake', 'classic-films', { page: 1, query: 'vampire' });
    await queries.collectionItems('fake', 'another-collection', { page: 1 });

    expect(spies.getCollectionItems).toHaveBeenCalledTimes(6);
  });

  it('re-requests after the cache is cleared', async () => {
    const { queries, spies } = createHarness();

    await queries.item('fake', 'item-1');
    queries.clear();
    await queries.item('fake', 'item-1');

    expect(spies.getItem).toHaveBeenCalledTimes(2);
  });

  it('bypasses the cache when the caller asks for fresh data', async () => {
    const { queries, spies } = createHarness();

    await queries.item('fake', 'item-1');
    await queries.item('fake', 'item-1', { fresh: true });

    expect(spies.getItem).toHaveBeenCalledTimes(2);
  });

  it('does not cache failures', async () => {
    const { queries, spies } = createHarness();

    spies.getItem.mockRejectedValueOnce(new Error('provider down'));

    await expect(queries.item('fake', 'item-1')).rejects.toThrow('provider down');
    await expect(queries.item('fake', 'item-1')).resolves.toMatchObject({ id: 'item-1' });
  });

  it('honours the outbound request limit', async () => {
    const limiter = createRequestLimiter(1);
    const { queries, spies } = createHarness(limiter);

    let active = 0;
    let peak = 0;

    spies.getItem.mockImplementation(async (itemId: string) => {
      active += 1;
      peak = Math.max(peak, active);

      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });

      active -= 1;

      return makeItem({ id: itemId });
    });

    await Promise.all([
      queries.item('fake', 'a'),
      queries.item('fake', 'b'),
      queries.item('fake', 'c'),
    ]);

    expect(peak).toBe(1);
    expect(spies.getItem).toHaveBeenCalledTimes(3);
  });

  it('exposes the remaining operations', async () => {
    const { queries, spies } = createHarness();

    await queries.categories('fake');
    await queries.collections('fake', 'movies');
    await queries.collection('fake', 'classic-films');
    await queries.relatedItems('fake', 'item-1');
    await queries.files('fake', 'item-1');
    await queries.search('fake', 'vampire', { contentTypes: ['movie'] });

    expect(spies.getCategories).toHaveBeenCalledWith(expect.objectContaining({}));
    expect(spies.getCollections).toHaveBeenCalledWith('movies', expect.anything());
    expect(spies.getCollection).toHaveBeenCalledWith('classic-films', expect.anything());
    expect(spies.getRelatedItems).toHaveBeenCalledWith('item-1', expect.anything());
    expect(spies.getAvailableFiles).toHaveBeenCalledWith('item-1', expect.anything());
    expect(spies.search).toHaveBeenCalledWith(
      'vampire',
      expect.objectContaining({ contentTypes: ['movie'] }),
    );
  });
});
