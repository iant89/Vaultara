/**
 * Provider contracts (design specification 10.2, 10.3).
 *
 * The core must never contain provider-specific fetching logic. Adapters implement this
 * interface, declare their real capabilities, and normalize results into shared models.
 * Optional methods exist only for genuinely optional provider functionality.
 *
 * Every operation accepts request options so the gateway can apply one policy — timeout,
 * cancellation, retries — to all of them rather than each adapter inventing its own.
 */

import type {
  ContentCategory,
  ContentCollection,
  ContentFile,
  ContentItem,
  ContentType,
} from './content';
import type { PaginatedResult, PaginationOptions } from './pagination';

/**
 * Ordering a provider may be asked for.
 *
 * `added-desc` means "newest additions to the collection first". Providers that cannot distinguish
 * an item's own date from the date it was added fall back to `date-desc` or ignore the request.
 */
export type SearchSort = 'relevance' | 'date-desc' | 'date-asc' | 'added-desc' | 'title-asc';

/** Options accepted by any single provider operation. */
export interface ProviderRequestOptions {
  /**
   * Cancels an in-flight request (design spec 25). Adapters must forward this to their
   * transport so an abandoned request is actually released, not merely ignored.
   */
  readonly signal?: AbortSignal;
  /** Per-call override of the gateway's default timeout, in milliseconds. */
  readonly timeoutMs?: number;
}

/**
 * Options shared by every operation that returns a page of content.
 *
 * `sort`, `contentTypes`, and `query` are narrowing controls: a provider that cannot honour one
 * ignores it rather than failing, because a filter the provider does not support must not break a
 * browse. Collections use them for ordering, type filtering, and searching inside a collection.
 */
export interface BrowseOptions extends PaginationOptions, ProviderRequestOptions {
  readonly sort?: SearchSort;
  readonly contentTypes?: readonly ContentType[];
  /** Free-text narrowing within the browse scope, e.g. inside one collection. */
  readonly query?: string;
}

export type SearchOptions = BrowseOptions;

/**
 * Capabilities a provider may advertise. Only advertise what is actually supported;
 * an unsupported capability must not prevent registration (design spec 10.3).
 */
export interface ProviderCapabilities {
  readonly search: boolean;
  readonly categories: boolean;
  readonly collections: boolean;
  readonly itemDetails: boolean;
  readonly relatedContent: boolean;
  readonly downloadableFiles: boolean;
  /**
   * Whether collections may themselves contain collections. The Archive nests them (a media type
   * holds collections, a collection may hold subcollections), so browsing a collection can offer a
   * "Collections inside" section before its items.
   */
  readonly subcollections: boolean;
  readonly streaming: boolean;
  readonly pagination: boolean;
  /** Adult-classified content requiring opt-in and visibility controls (design spec 13). */
  readonly adultContent: boolean;
  /** Content families this provider can return; empty means "not declared". */
  readonly contentTypes: readonly ContentType[];
}

/**
 * Errors degrade rather than throw: an adapter that omits `streaming` from a partial
 * capability description is treated as "does not support it", because guessing the other way
 * would advertise functionality that does not exist.
 */
export function createProviderCapabilities(
  overrides: Partial<ProviderCapabilities> = {},
): ProviderCapabilities {
  return {
    search: false,
    categories: false,
    collections: false,
    itemDetails: false,
    relatedContent: false,
    downloadableFiles: false,
    subcollections: false,
    streaming: false,
    pagination: false,
    adultContent: false,
    contentTypes: [],
    ...overrides,
  };
}

export interface ContentProvider {
  readonly id: string;
  readonly name: string;
  readonly version: string;

  /**
   * Optional one-off setup (authentication, index warm-up). The registry runs it once per
   * provider and isolates failures, so one adapter cannot prevent the others from starting.
   */
  initialize?(): Promise<void>;

  /**
   * Optional cheap liveness probe. Must not perform expensive work; the registry uses it to
   * refresh reported availability.
   */
  checkHealth?(): Promise<boolean>;

  getCapabilities(): ProviderCapabilities;

  search(query: string, options?: SearchOptions): Promise<PaginatedResult<ContentItem>>;

  getCategories(options?: ProviderRequestOptions): Promise<readonly ContentCategory[]>;

  getCollections(
    categoryId: string,
    options?: BrowseOptions,
  ): Promise<PaginatedResult<ContentCollection>>;

  getCollection(collectionId: string, options?: ProviderRequestOptions): Promise<ContentCollection>;

  getCollectionItems(
    collectionId: string,
    options?: BrowseOptions,
  ): Promise<PaginatedResult<ContentItem>>;

  getItem(itemId: string, options?: ProviderRequestOptions): Promise<ContentItem>;

  /**
   * Collections nested inside a collection (roadmap 5.3). Optional: a provider with a flat
   * hierarchy does not implement it, and the interface then shows no such section.
   */
  getSubcollections?(
    collectionId: string,
    options?: BrowseOptions,
  ): Promise<PaginatedResult<ContentCollection>>;

  /**
   * Items that sit beside the given one, paged so the interface can add more on request instead
   * of either truncating the list or fetching everything up front.
   */
  getRelatedItems(itemId: string, options?: BrowseOptions): Promise<PaginatedResult<ContentItem>>;

  getAvailableFiles?(
    itemId: string,
    options?: ProviderRequestOptions,
  ): Promise<readonly ContentFile[]>;

  getDownloadUrl?(
    itemId: string,
    fileId: string,
    options?: ProviderRequestOptions,
  ): Promise<string | null>;
}

/** Capability flags that gate a contract method. */
export type ProviderCapabilityKey =
  | 'search'
  | 'categories'
  | 'collections'
  | 'subcollections'
  | 'itemDetails'
  | 'relatedContent'
  | 'downloadableFiles';
