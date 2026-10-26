/**
 * Typed, cached reads of provider content for the interface.
 *
 * Everything the UI needs goes through here so three rules hold in one place rather than in every
 * component: requests are deduplicated and briefly cached, bursts are rate-limited, and every call
 * still passes through the gateway (validation, timeouts, retries, health).
 *
 * Cache keys include every argument that changes the result. A key that omits an argument would
 * serve page two's data for page one — the kind of bug that only appears when a user paginates.
 */

import type {
  ContentCategory,
  ContentCollection,
  ContentFile,
  ContentItem,
  ContentType,
} from '../models/content';
import type { PaginatedResult } from '../models/pagination';
import type { SearchSort } from '../models/provider';
import type { ProviderGateway } from '../providers/gateway';
import {
  createRequestCache,
  type LoadOptions,
  type RequestCache,
  type RequestCacheOptions,
} from './requestCache';
import {
  createRequestLimiter,
  type RequestLimiter,
  DEFAULT_MAX_CONCURRENT_REQUESTS,
} from './requestLimiter';

/** Paging and narrowing for any list of items. */
export interface ItemQuery {
  readonly page?: number;
  readonly pageSize?: number;
  readonly sort?: SearchSort;
  readonly contentTypes?: readonly ContentType[];
  /** Free-text narrowing within the browse scope. */
  readonly query?: string;
}

export interface PageQuery {
  readonly page?: number;
  readonly pageSize?: number;
}

/** Paging and ordering for a list of collections. */
export interface CollectionQuery extends PageQuery {
  readonly sort?: SearchSort;
}

/** Paging for a list of items that is not a full browse (related content). */
export type ItemPageQuery = PageQuery;

export interface ContentQueries {
  categories(providerId: string, options?: LoadOptions): Promise<readonly ContentCategory[]>;
  collections(
    providerId: string,
    categoryId: string,
    paging?: CollectionQuery,
    options?: LoadOptions,
  ): Promise<PaginatedResult<ContentCollection>>;
  subcollections(
    providerId: string,
    collectionId: string,
    paging?: CollectionQuery,
    options?: LoadOptions,
  ): Promise<PaginatedResult<ContentCollection>>;
  collection(
    providerId: string,
    collectionId: string,
    options?: LoadOptions,
  ): Promise<ContentCollection>;
  collectionItems(
    providerId: string,
    collectionId: string,
    query?: ItemQuery,
    options?: LoadOptions,
  ): Promise<PaginatedResult<ContentItem>>;
  item(providerId: string, itemId: string, options?: LoadOptions): Promise<ContentItem>;
  relatedItems(
    providerId: string,
    itemId: string,
    paging?: ItemPageQuery,
    options?: LoadOptions,
  ): Promise<PaginatedResult<ContentItem>>;
  files(providerId: string, itemId: string, options?: LoadOptions): Promise<readonly ContentFile[]>;
  search(
    providerId: string,
    text: string,
    query?: ItemQuery,
    options?: LoadOptions,
  ): Promise<PaginatedResult<ContentItem>>;
  /** Drop every cached result. Exposed for tests and for a future "refresh" affordance. */
  clear(): void;
}

export interface ContentQueriesOptions {
  readonly cache?: RequestCache;
  readonly cacheOptions?: RequestCacheOptions;
  readonly limiter?: RequestLimiter;
  readonly maxConcurrentRequests?: number;
}

/** Stable, argument-complete cache key. */
function cacheKey(parts: readonly unknown[]): string {
  return JSON.stringify(parts);
}

export function createContentQueries(
  gateway: ProviderGateway,
  options: ContentQueriesOptions = {},
): ContentQueries {
  const cache = options.cache ?? createRequestCache(options.cacheOptions);
  const limiter =
    options.limiter ??
    createRequestLimiter(options.maxConcurrentRequests ?? DEFAULT_MAX_CONCURRENT_REQUESTS);

  return {
    categories(providerId, loadOptions) {
      return cache.load(
        cacheKey(['categories', providerId]),
        () => limiter.run(() => gateway.getCategories(providerId)),
        { ...loadOptions },
      );
    },

    collections(providerId, categoryId, paging = {}, loadOptions) {
      return cache.load(
        cacheKey([
          'collections',
          providerId,
          categoryId,
          paging.page,
          paging.pageSize,
          paging.sort,
        ]),
        () =>
          limiter.run(() =>
            gateway.getCollections(providerId, categoryId, {
              page: paging.page,
              pageSize: paging.pageSize,
              sort: paging.sort,
            }),
          ),
        { ...loadOptions },
      );
    },

    subcollections(providerId, collectionId, paging = {}, loadOptions) {
      return cache.load(
        cacheKey([
          'subcollections',
          providerId,
          collectionId,
          paging.page,
          paging.pageSize,
          paging.sort,
        ]),
        () =>
          limiter.run(() =>
            gateway.getSubcollections(providerId, collectionId, {
              page: paging.page,
              pageSize: paging.pageSize,
              sort: paging.sort,
            }),
          ),
        { ...loadOptions },
      );
    },

    collection(providerId, collectionId, loadOptions) {
      return cache.load(
        cacheKey(['collection', providerId, collectionId]),
        () => limiter.run(() => gateway.getCollection(providerId, collectionId)),
        { ...loadOptions },
      );
    },

    collectionItems(providerId, collectionId, query = {}, loadOptions) {
      return cache.load(
        cacheKey([
          'collection-items',
          providerId,
          collectionId,
          query.page,
          query.pageSize,
          query.sort,
          query.contentTypes,
          query.query,
        ]),
        () =>
          limiter.run(() =>
            gateway.getCollectionItems(providerId, collectionId, {
              page: query.page,
              pageSize: query.pageSize,
              sort: query.sort,
              contentTypes: query.contentTypes,
              query: query.query,
            }),
          ),
        { ...loadOptions },
      );
    },

    item(providerId, itemId, loadOptions) {
      return cache.load(
        cacheKey(['item', providerId, itemId]),
        () => limiter.run(() => gateway.getItem(providerId, itemId)),
        { ...loadOptions },
      );
    },

    relatedItems(providerId, itemId, paging = {}, loadOptions) {
      return cache.load(
        cacheKey(['related', providerId, itemId, paging.page, paging.pageSize]),
        () =>
          limiter.run(() =>
            gateway.getRelatedItems(providerId, itemId, {
              page: paging.page,
              pageSize: paging.pageSize,
            }),
          ),
        { ...loadOptions },
      );
    },

    files(providerId, itemId, loadOptions) {
      return cache.load(
        cacheKey(['files', providerId, itemId]),
        () => limiter.run(() => gateway.getAvailableFiles(providerId, itemId)),
        { ...loadOptions },
      );
    },

    search(providerId, text, query = {}, loadOptions) {
      return cache.load(
        cacheKey([
          'search',
          providerId,
          text,
          query.page,
          query.pageSize,
          query.sort,
          query.contentTypes,
        ]),
        () =>
          limiter.run(() =>
            gateway.search(providerId, text, {
              page: query.page,
              pageSize: query.pageSize,
              sort: query.sort,
              contentTypes: query.contentTypes,
            }),
          ),
        { ...loadOptions },
      );
    },

    clear() {
      cache.clear();
    },
  };
}
