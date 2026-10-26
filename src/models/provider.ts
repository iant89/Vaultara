/**
 * Provider contracts (design specification 10.2, 10.3).
 *
 * The core must never contain provider-specific fetching logic. Adapters implement this
 * interface, declare their real capabilities, and normalize results into shared models.
 * Optional methods exist only for genuinely optional provider functionality.
 */

import type {
  ContentCategory,
  ContentCollection,
  ContentFile,
  ContentItem,
  ContentType,
} from './content';
import type { PaginatedResult, PaginationOptions } from './pagination';

export type SearchSort = 'relevance' | 'date-desc' | 'date-asc' | 'title-asc';

export interface SearchOptions extends PaginationOptions {
  readonly contentTypes?: readonly ContentType[];
  readonly sort?: SearchSort;
  /** Allows the caller to cancel obsolete requests (design spec 25). */
  readonly signal?: AbortSignal;
}

/**
 * Capabilities a provider may advertise. Only advertise what is actually supported;
 * an unsupported capability must not prevent registration.
 */
export interface ProviderCapabilities {
  readonly search: boolean;
  readonly categories: boolean;
  readonly collections: boolean;
  readonly itemDetails: boolean;
  readonly relatedContent: boolean;
  readonly downloadableFiles: boolean;
  readonly streaming: boolean;
  readonly pagination: boolean;
  /** Adult-classified content requiring opt-in and visibility controls (design spec 13). */
  readonly adultContent: boolean;
  /** Content families this provider can return; empty means "not declared". */
  readonly contentTypes: readonly ContentType[];
}

export interface ContentProvider {
  readonly id: string;
  readonly name: string;
  readonly version: string;

  getCapabilities(): ProviderCapabilities;

  search(query: string, options?: SearchOptions): Promise<PaginatedResult<ContentItem>>;

  getCategories(): Promise<readonly ContentCategory[]>;

  getCollections(
    categoryId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ContentCollection>>;

  getCollection(collectionId: string): Promise<ContentCollection>;

  getCollectionItems(
    collectionId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ContentItem>>;

  getItem(itemId: string): Promise<ContentItem>;

  getRelatedItems(itemId: string): Promise<readonly ContentItem[]>;

  getAvailableFiles?(itemId: string): Promise<readonly ContentFile[]>;

  getDownloadUrl?(itemId: string, fileId: string): Promise<string | null>;
}
