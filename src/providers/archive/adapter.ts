/**
 * Internet Archive provider (design specification 11, roadmap Phase 4).
 *
 * The adapter is the only provider-specific code in the application, and it stops at the shared
 * model boundary: it translates calls into Archive API requests, maps payloads with `map.ts`, and
 * throws `AppError`s. Timeouts, retries, cancellation and health accounting belong to the gateway
 * and reliability layer, so nothing here sleeps, retries, or reads React state.
 *
 * Requests are deliberately small: metadata and search only. No media is downloaded to render an
 * item — artwork and downloads are URLs the browser resolves itself (design spec 11.4).
 *
 * The Adult provider (design spec 13) reuses this adapter with a different identity and a
 * required-collection allowlist. Ordinary Archive browsing excludes that collection so Adult
 * items cannot leak into Archive discovery.
 */

import { ADULT_ARCHIVE_COLLECTION_ID } from '../../config/adult';
import type {
  ContentCategory,
  ContentCollection,
  ContentFile,
  ContentItem,
} from '../../models/content';
import { createAppError } from '../../models/errors';
import {
  calculateOffset,
  createPaginatedResult,
  resolvePaginationOptions,
  type PaginatedResult,
} from '../../models/pagination';
import {
  createProviderCapabilities,
  type BrowseOptions,
  type ContentProvider,
  type ProviderCapabilities,
  type ProviderRequestOptions,
  type SearchOptions,
  type SearchSort,
} from '../../models/provider';
import { normalizeStringList, normalizeText } from '../normalize';
import { ArchiveApi, type ArchiveRequestOptions, type Fetcher } from './api';
import {
  ARCHIVE_CATEGORIES,
  findArchiveCategory,
  findArchiveCategoryByCollection,
  type ArchiveCategoryDefinition,
} from './catalog';
import {
  ARCHIVE_PROVIDER_ID,
  isArchiveCollection,
  mapCollection,
  mapFiles,
  mapItem,
  readIdentifier,
  readItemAccess,
  readMetadataRecord,
} from './map';
import {
  buildCollectionClause,
  buildMediatypeClause,
  buildQuery,
  COLLECTION_MEDIATYPE_CLAUSE,
  collectionExclusionClause,
  escapeLucene,
  EXCLUDE_COLLECTIONS_CLAUSE,
  mapSort,
} from './query';
import type { ArchiveMetadataResponse, ArchiveSearchResponse } from './types';

/**
 * The Archive refuses searches that reach past 10,000 documents. Reporting that ceiling as the
 * total keeps `hasMore` honest: without it the interface would keep offering "next page" for
 * results the provider will never return.
 */
export const ARCHIVE_MAX_RESULTS = 10_000;

/**
 * Related items per request. One row is enough to be useful, and every further batch costs one
 * request that the interface only makes when the reader asks for more.
 */
export const ARCHIVE_RELATED_LIMIT = 12;

/** Collections listed per request, whether at a media type or inside a collection. */
export const ARCHIVE_COLLECTION_PAGE_SIZE = 24;

const SEARCH_DOCUMENT_FIELDS: readonly string[] = [
  'identifier',
  'title',
  'description',
  'mediatype',
  'creator',
  'date',
  'year',
  'subject',
  'collection',
  'language',
  'licenseurl',
  'downloads',
];

const COLLECTION_DOCUMENT_FIELDS: readonly string[] = [
  'identifier',
  'title',
  'description',
  'mediatype',
  'collection',
  'subject',
];

export interface ArchiveProviderIdentity {
  readonly id: string;
  readonly name: string;
  readonly adultContent: boolean;
}

export interface ArchiveProviderOptions {
  /** Overrides the API base, e.g. for a proxy. */
  readonly host?: string;
  /** Injectable transport. Tests must never reach the network. */
  readonly fetchImpl?: Fetcher;
  /** Pre-built API client, which takes precedence over `host` and `fetchImpl`. */
  readonly api?: ArchiveApi;
  /**
   * Presentation identity. The Adult provider reuses this adapter with a different id so a
   * failure there cannot be blamed on ordinary Archive browsing.
   */
  readonly identity?: ArchiveProviderIdentity;
  /** Every result must belong to at least one of these Archive collections. */
  readonly requiredCollectionIds?: readonly string[];
  /**
   * Collections ordinary Archive browsing must never return. Defaults to the adults-only
   * collection unless the caller already supplied a required-collection allowlist.
   */
  readonly excludedCollectionIds?: readonly string[];
  /** Category catalogue; Adult supplies a narrower media-type list. */
  readonly categories?: readonly ArchiveCategoryDefinition[];
}

function cancelledError(
  signal: AbortSignal | undefined,
  providerId: string,
): ReturnType<typeof createAppError> {
  return createAppError('cancelled', 'The request was cancelled.', {
    providerId,
    ...(signal?.reason !== undefined ? { cause: signal.reason } : {}),
  });
}

function invalidResponseError(
  message: string,
  providerId: string,
): ReturnType<typeof createAppError> {
  return createAppError('invalid-response', message, { providerId });
}

function notFoundError(message: string, providerId: string): ReturnType<typeof createAppError> {
  return createAppError('not-found', message, { providerId });
}

function emptyPage<T>(page: number, pageSize: number): PaginatedResult<T> {
  return { items: [], page, pageSize, hasMore: false };
}

/** A search body without a `docs` array is a provider defect, not an empty result. */
function readDocuments(
  response: ArchiveSearchResponse,
  providerId: string,
): readonly Record<string, unknown>[] {
  const docs = response.response?.docs;

  if (!Array.isArray(docs)) {
    throw invalidResponseError('The search response did not contain a document list.', providerId);
  }

  const documents: Record<string, unknown>[] = [];

  for (const doc of docs) {
    const record = readMetadataRecord(doc);

    // A document that is not an object cannot describe an item. Dropping it keeps the rest of the
    // page usable instead of failing the whole search over one malformed entry.
    if (record !== undefined) {
      documents.push(record);
    }
  }

  return documents;
}

function readTotal(response: ArchiveSearchResponse): number | undefined {
  const numFound = response.response?.numFound;

  if (typeof numFound !== 'number' || !Number.isFinite(numFound) || numFound < 0) {
    return undefined;
  }

  return Math.min(Math.trunc(numFound), ARCHIVE_MAX_RESULTS);
}

export class ArchiveProvider implements ContentProvider {
  readonly id: string;
  readonly name: string;
  readonly version = '1.0.0';

  private readonly api: ArchiveApi;
  private readonly adultContent: boolean;
  private readonly requiredCollectionIds: readonly string[];
  private readonly excludedCollectionIds: readonly string[];
  private readonly categoryCatalog: readonly ArchiveCategoryDefinition[];

  constructor(options: ArchiveProviderOptions = {}) {
    this.id = options.identity?.id ?? ARCHIVE_PROVIDER_ID;
    this.name = options.identity?.name ?? 'Internet Archive';
    this.adultContent = options.identity?.adultContent ?? false;
    this.requiredCollectionIds = options.requiredCollectionIds ?? [];
    this.excludedCollectionIds =
      options.excludedCollectionIds ??
      (this.requiredCollectionIds.length > 0 ? [] : [ADULT_ARCHIVE_COLLECTION_ID]);
    this.categoryCatalog = options.categories ?? ARCHIVE_CATEGORIES;
    this.api =
      options.api ??
      new ArchiveApi({
        ...(options.host !== undefined ? { host: options.host } : {}),
        ...(options.fetchImpl !== undefined ? { fetchImpl: options.fetchImpl } : {}),
        providerId: this.id,
      });
  }

  getCapabilities(): ProviderCapabilities {
    return createProviderCapabilities({
      search: true,
      categories: true,
      collections: true,
      itemDetails: true,
      relatedContent: true,
      downloadableFiles: true,
      // The Archive nests collections: a media type holds collections, and a collection can hold
      // further subcollections before any items.
      subcollections: true,
      // Nothing is streamed through the application: files are linked, and a viewer arrives in
      // a later phase (roadmap Phase 8).
      streaming: false,
      pagination: true,
      adultContent: this.adultContent,
      // Only families this adapter actually emits — `texts` maps to `document`, so `book` and
      // `video` are absent rather than advertised without ever appearing.
      contentTypes: [
        'document',
        'movie',
        'audio',
        'music',
        'image',
        'software',
        'website',
        'collection',
      ],
    });
  }

  /**
   * Cheap liveness probe: one indexed identifier lookup with `rows=1`. An unknown identifier still
   * proves the search endpoint answered, which is what health means here.
   */
  async checkHealth(): Promise<boolean> {
    const required = this.requiredCollectionIds[0];
    await this.api.search({
      query: required === undefined ? 'identifier:archive' : buildCollectionClause(required),
      page: 1,
      pageSize: 1,
      fields: ['identifier'],
    });

    return true;
  }

  async search(query: string, options: SearchOptions = {}): Promise<PaginatedResult<ContentItem>> {
    this.ensureActive(options.signal);

    const { page, pageSize } = resolvePaginationOptions(options);
    const text = normalizeText(query);

    // An empty query with no filter would ask for the entire Archive; the interface shows an empty
    // state instead (design spec 5.4). A required collection (Adult) is itself a filter.
    const mediatypeClause = buildMediatypeClause(options.contentTypes);

    if (text === '' && mediatypeClause === undefined && this.requiredCollectionIds.length === 0) {
      return emptyPage<ContentItem>(page, pageSize);
    }

    if (calculateOffset(page, pageSize) >= ARCHIVE_MAX_RESULTS) {
      return emptyPage<ContentItem>(page, pageSize);
    }

    const includeCollections = options.contentTypes?.includes('collection') === true;
    const sort = mapSort(options.sort);
    const response = await this.api.search(
      {
        query: buildQuery(text.length > 0 ? escapeLucene(text) : '', [
          mediatypeClause,
          collectionExclusionClause(options.contentTypes),
          ...(includeCollections ? this.collectionScopeClauses() : this.itemScopeClauses()),
        ]),
        page,
        pageSize,
        ...(sort !== undefined ? { sort } : {}),
        fields: SEARCH_DOCUMENT_FIELDS,
      },
      this.requestOptions(options),
    );

    return this.toItemPage(response, page, pageSize, { includeCollections });
  }

  async getCategories(options: ProviderRequestOptions = {}): Promise<readonly ContentCategory[]> {
    this.ensureActive(options.signal);

    // The media type list is configuration, so this needs no request. Artwork still comes from
    // the Archive's thumbnail service. Adult categories use the adults-only collection cover so
    // a Movies shelf cannot show a general-audience poster (design spec 13.3).
    const artworkId = this.requiredCollectionIds[0];

    return this.categoryCatalog.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      artworkUrl: this.api.thumbnailUrl(artworkId ?? category.collectionId),
      providerId: this.id,
    }));
  }

  /**
   * Collections filed under a media type.
   *
   * One request: `mediatype:collection` selects containers, and the ancestor clause restricts
   * them to this branch of the tree. Because the Archive adds every ancestor to an item's
   * `collection` field, nested subcollections are included — the list is complete for the branch,
   * and each collection page narrows it again one level down.
   */
  async getCollections(
    categoryId: string,
    options: BrowseOptions = {},
  ): Promise<PaginatedResult<ContentCollection>> {
    this.ensureActive(options.signal);

    const category = findArchiveCategory(categoryId, this.categoryCatalog);

    if (category === undefined) {
      throw notFoundError(
        `The Internet Archive category ${JSON.stringify(categoryId)} is not one this app offers.`,
        this.id,
      );
    }

    return this.searchCollections(
      [
        COLLECTION_MEDIATYPE_CLAUSE,
        buildCollectionClause(category.collectionId),
        ...this.collectionScopeClauses(),
      ],
      { page: options.page, pageSize: options.pageSize, sort: options.sort, query: options.query },
      [category.id],
      options,
    );
  }

  /**
   * Collections inside a collection.
   *
   * Same shape as a category's list, one level lower in the tree. A collection with no
   * subcollections returns an empty page rather than an error: flat structures are the norm on
   * the Archive, and the interface simply shows no "Collections inside" section.
   */
  async getSubcollections(
    collectionId: string,
    options: BrowseOptions = {},
  ): Promise<PaginatedResult<ContentCollection>> {
    this.ensureActive(options.signal);

    const category = findArchiveCategory(collectionId, this.categoryCatalog);

    if (category !== undefined && this.requiredCollectionIds.length > 0) {
      return this.getCollections(category.id, options);
    }

    const identifier = this.requireIdentifier(collectionId, 'collection');

    return this.searchCollections(
      [
        COLLECTION_MEDIATYPE_CLAUSE,
        buildCollectionClause(identifier),
        ...this.collectionScopeClauses(),
      ],
      { page: options.page, pageSize: options.pageSize, sort: options.sort, query: options.query },
      [],
      options,
    );
  }

  async getCollection(
    collectionId: string,
    options: ProviderRequestOptions = {},
  ): Promise<ContentCollection> {
    this.ensureActive(options.signal);

    const category = findArchiveCategory(collectionId, this.categoryCatalog);

    if (category !== undefined && this.requiredCollectionIds.length > 0) {
      const root = this.requiredCollectionIds[0] ?? ADULT_ARCHIVE_COLLECTION_ID;

      return {
        id: category.id,
        title: category.name,
        description: category.description,
        providerId: this.id,
        thumbnailUrl: this.api.thumbnailUrl(root),
        sourceUrl: this.api.detailsUrl(root),
        categoryIds: [category.id],
        metadata: {
          virtual: true,
          mediatype: category.mediatype,
          sourcePage: this.api.detailsUrl(root),
        },
      };
    }

    const identifier = this.requireIdentifier(collectionId, 'collection');
    const { response, metadata } = await this.loadItem(identifier, options);

    // A count needs its own request (`rows=0`). If it fails the collection is still worth showing,
    // so an item count is dropped rather than the page erroring.
    const itemCount = await this.fetchItemCount(identifier, options);
    const collection = mapCollection(
      {
        metadata,
        isCollection: response.is_collection,
        ...(itemCount !== undefined ? { itemCount } : {}),
      },
      this.api,
      this.id,
    );

    if (collection === undefined) {
      throw notFoundError(
        `The Internet Archive collection ${JSON.stringify(identifier)} has no metadata.`,
        this.id,
      );
    }

    return collection;
  }

  async getCollectionItems(
    collectionId: string,
    options: BrowseOptions = {},
  ): Promise<PaginatedResult<ContentItem>> {
    this.ensureActive(options.signal);

    const { page, pageSize } = resolvePaginationOptions(options);

    if (calculateOffset(page, pageSize) >= ARCHIVE_MAX_RESULTS) {
      return emptyPage<ContentItem>(page, pageSize);
    }

    const category = findArchiveCategory(collectionId, this.categoryCatalog);
    const text = normalizeText(options.query ?? '');
    const collectionClause =
      category !== undefined && this.requiredCollectionIds.length > 0
        ? undefined
        : buildCollectionClause(this.requireIdentifier(collectionId, 'collection'));
    const mediatypeFromCategory =
      category !== undefined && this.requiredCollectionIds.length > 0
        ? `mediatype:${escapeLucene(category.mediatype)}`
        : undefined;

    // `-mediatype:collection` is what keeps the list to items: the Archive files ancestors into
    // every item's `collection` field, and a subcollection is an item too.
    const query = buildQuery(text.length > 0 ? escapeLucene(text) : '', [
      collectionClause,
      mediatypeFromCategory,
      EXCLUDE_COLLECTIONS_CLAUSE,
      buildMediatypeClause(options.contentTypes),
      ...this.itemScopeClauses(),
    ]);

    // Most-downloaded first by default: the Archive's relevance order within a collection is
    // effectively arbitrary, so a stable, meaningful order is better than a random one. Callers
    // that ask for an order get it; `relevance` still means the provider's own default here.
    const sort = mapSort(options.sort) ?? 'downloads desc';

    const response = await this.api.search(
      {
        query,
        page,
        pageSize,
        sort,
        fields: SEARCH_DOCUMENT_FIELDS,
      },
      this.requestOptions(options),
    );

    return this.toItemPage(response, page, pageSize);
  }

  async getItem(itemId: string, options: ProviderRequestOptions = {}): Promise<ContentItem> {
    this.ensureActive(options.signal);

    const identifier = this.requireIdentifier(itemId, 'item');
    const { response, metadata } = await this.loadItem(identifier, options);

    const item = mapItem(
      {
        metadata,
        filesCount: response.files_count,
        itemSize: response.item_size,
        isDark: response.is_dark,
        noDownload: response.nodownload,
        isCollection: response.is_collection,
      },
      this.api,
      this.id,
    );

    if (item === undefined) {
      throw notFoundError(
        `The Internet Archive item ${JSON.stringify(identifier)} has no identifier.`,
        this.id,
      );
    }

    return item;
  }

  /**
   * Related items are the item's siblings inside its own collections.
   *
   * Preferences and history do not exist yet (roadmap Phase 7), so "related" is a provider-level
   * relationship rather than a personalised one. The results are paged so the interface can add
   * another batch on request instead of truncating the list: the reader is the only one who knows
   * how far down it they want to go.
   *
   * One extra row is requested per page because the item itself is filtered out here — a Lucene
   * negation on the item's own identifier is not worth a provider-specific query shape — and the
   * page is trimmed back to its requested size so consecutive pages never overlap.
   */
  async getRelatedItems(
    itemId: string,
    options: BrowseOptions = {},
  ): Promise<PaginatedResult<ContentItem>> {
    this.ensureActive(options.signal);

    const identifier = this.requireIdentifier(itemId, 'item');
    // A missing or withdrawn item is reported as such: "no related content" is a statement about
    // an item that exists, and an empty page would hide the real problem.
    const { metadata } = await this.loadItem(identifier, options);

    const { page, pageSize } = resolvePaginationOptions({
      page: options.page,
      pageSize: options.pageSize ?? ARCHIVE_RELATED_LIMIT,
    });

    if (calculateOffset(page, pageSize) >= ARCHIVE_MAX_RESULTS) {
      return emptyPage<ContentItem>(page, pageSize);
    }

    const excluded = new Set(this.excludedCollectionIds.map((id) => id.toLowerCase()));
    const collections = normalizeStringList(metadata['collection'], {
      maxItems: 3,
      maxLength: 120,
    }).filter(
      (collection) =>
        collection.toLowerCase() !== 'inlibrary' && !excluded.has(collection.toLowerCase()),
    );

    if (collections.length === 0) {
      return createPaginatedResult<ContentItem>([], { page, pageSize, total: 0 });
    }

    const clause = collections.map((collection) => buildCollectionClause(collection)).join(' OR ');
    const search = await this.api.search(
      {
        query: buildQuery('', [
          `(${clause})`,
          EXCLUDE_COLLECTIONS_CLAUSE,
          ...this.itemScopeClauses(),
        ]),
        page,
        pageSize: pageSize + 1,
        sort: 'downloads desc',
        fields: SEARCH_DOCUMENT_FIELDS,
      },
      this.requestOptions(options),
    );

    const related: ContentItem[] = [];

    for (const document of readDocuments(search, this.id)) {
      const documentId = readIdentifier(document);

      if (documentId === '' || documentId === identifier) {
        continue;
      }

      const item = mapItem({ metadata: document }, this.api, this.id);

      // A sibling collection is not related *content*; it belongs on a collection shelf.
      if (
        item === undefined ||
        item.type === 'collection' ||
        !this.membershipAllows(item.id, document)
      ) {
        continue;
      }

      related.push(item);

      if (related.length >= pageSize) {
        break;
      }
    }

    // The item is part of its own collections, so the reported total counts it once.
    const found = readTotal(search);
    const total = found === undefined ? undefined : Math.max(0, found - 1);

    return createPaginatedResult(related, {
      page,
      pageSize,
      ...(total !== undefined ? { total } : {}),
    });
  }

  async getAvailableFiles(
    itemId: string,
    options: ProviderRequestOptions = {},
  ): Promise<readonly ContentFile[]> {
    this.ensureActive(options.signal);

    const identifier = this.requireIdentifier(itemId, 'item');
    const { response, metadata } = await this.loadItem(identifier, options);
    const access = readItemAccess(metadata, {
      isDark: response.is_dark,
      noDownload: response.nodownload,
    });

    // An item existing does not imply its files are usable (design spec 11.3): the access state
    // travels with each file so a restricted scan can still be listed with its restriction shown.
    return mapFiles(response.files, identifier, access, this.api, this.id);
  }

  /**
   * Resolve a download URL, or `null` when the file is absent or restricted.
   *
   * `null` rather than an error is the contract's way of saying "nothing to offer"; the caller
   * decides how to present that.
   */
  async getDownloadUrl(
    itemId: string,
    fileId: string,
    options: ProviderRequestOptions = {},
  ): Promise<string | null> {
    this.ensureActive(options.signal);

    const identifier = this.requireIdentifier(itemId, 'item');
    const requested = normalizeText(fileId);

    if (requested === '') {
      return null;
    }

    // Deliberately lenient: `null` is the contract's channel for "no download to offer", so a
    // withdrawn or unknown item does not throw here the way it does for item details.
    const response = await this.api.getMetadata(identifier, this.requestOptions(options));

    if (response.is_dark === true || !Array.isArray(response.files)) {
      return null;
    }

    const metadata = readMetadataRecord(response.metadata) ?? {};

    if (!this.membershipAllows(identifier, metadata)) {
      return null;
    }

    const access = readItemAccess(metadata, {
      isDark: response.is_dark,
      noDownload: response.nodownload,
    });

    if (access.dark || access.lending || access.noDownload) {
      return null;
    }

    const entry = response.files
      .map((file) => readMetadataRecord(file))
      .find((file) => file !== undefined && normalizeText(file['name']) === requested);

    if (entry === undefined || entry['private'] === true) {
      return null;
    }

    return this.api.downloadUrl(identifier, requested);
  }

  // ------------------------------------------------------------------ internals

  private ensureActive(signal: AbortSignal | undefined): void {
    if (signal?.aborted === true) {
      throw cancelledError(signal, this.id);
    }
  }

  private requestOptions(options: ProviderRequestOptions): ArchiveRequestOptions {
    return options.signal !== undefined ? { signal: options.signal } : {};
  }

  /**
   * Identifiers arrive from route parameters, so a blank one is untrusted input rather than a
   * programming error: it names nothing, and the caller gets the same answer as any unknown id.
   */
  private requireIdentifier(value: string, kind: string): string {
    const identifier = normalizeText(value);

    if (identifier === '') {
      throw notFoundError(`An Internet Archive ${kind} identifier is required.`, this.id);
    }

    return identifier;
  }

  private itemScopeClauses(): string[] {
    const clauses: string[] = [];

    if (this.requiredCollectionIds.length === 1) {
      const [required] = this.requiredCollectionIds;
      clauses.push(buildCollectionClause(required ?? ''));
    } else if (this.requiredCollectionIds.length > 1) {
      clauses.push(
        `(${this.requiredCollectionIds.map((id) => buildCollectionClause(id)).join(' OR ')})`,
      );
    }

    for (const id of this.excludedCollectionIds) {
      clauses.push(`-collection:${escapeLucene(id)}`);
    }

    return clauses;
  }

  private collectionScopeClauses(): string[] {
    return [
      ...this.itemScopeClauses(),
      ...this.excludedCollectionIds.map((id) => `-identifier:${escapeLucene(id)}`),
    ];
  }

  private membershipAllows(identifier: string, metadata: Record<string, unknown>): boolean {
    const collections = normalizeStringList(metadata['collection'], {
      maxItems: 64,
      maxLength: 120,
    });
    const names = new Set([identifier, ...collections].map((value) => value.toLowerCase()));

    if (
      this.requiredCollectionIds.length > 0 &&
      !this.requiredCollectionIds.some((id) => names.has(id.toLowerCase()))
    ) {
      return false;
    }

    return !this.excludedCollectionIds.some((id) => names.has(id.toLowerCase()));
  }

  /**
   * Metadata for an item or collection that must be publicly readable.
   *
   * The Archive answers an unknown identifier with `200` and an empty object, so absence is a
   * missing item rather than an HTTP failure, and `is_dark` items are withdrawn rather than
   * temporarily unavailable. Both are `not-found` from the caller's point of view.
   */
  private async loadItem(
    identifier: string,
    options: ProviderRequestOptions,
  ): Promise<{
    readonly response: ArchiveMetadataResponse;
    readonly metadata: Record<string, unknown>;
  }> {
    const response = await this.api.getMetadata(identifier, this.requestOptions(options));
    const metadata = readMetadataRecord(response.metadata);

    if (metadata === undefined) {
      throw notFoundError(
        `The Internet Archive item ${JSON.stringify(identifier)} was not found.`,
        this.id,
      );
    }

    if (response.is_dark === true) {
      throw notFoundError(
        `The Internet Archive item ${JSON.stringify(identifier)} is not publicly available.`,
        this.id,
      );
    }

    if (!this.membershipAllows(identifier, metadata)) {
      throw notFoundError(
        `The Internet Archive item ${JSON.stringify(identifier)} is not available from this provider.`,
        this.id,
      );
    }

    return { response, metadata };
  }

  private async fetchItemCount(
    identifier: string,
    options: ProviderRequestOptions,
  ): Promise<number | undefined> {
    try {
      return await this.api.count(
        buildQuery('', [buildCollectionClause(identifier), ...this.itemScopeClauses()]),
        this.requestOptions(options),
      );
    } catch (error) {
      if (isCancelled(error)) {
        throw error;
      }

      return undefined;
    }
  }

  /**
   * One page of collections matching the given clauses.
   *
   * Shared by the media type list and the "collections inside" list because they differ only in
   * scope. Sorting defaults to most-downloaded: the Archive's relevance order for containers is
   * effectively arbitrary, and the biggest collections are the ones readers are looking for.
   */
  private async searchCollections(
    clauses: readonly string[],
    paging: {
      readonly page?: number;
      readonly pageSize?: number;
      readonly sort?: SearchSort;
      readonly query?: string;
    },
    fallbackCategoryIds: readonly string[],
    options: ProviderRequestOptions,
  ): Promise<PaginatedResult<ContentCollection>> {
    const { page, pageSize } = resolvePaginationOptions({
      page: paging.page,
      pageSize: paging.pageSize ?? ARCHIVE_COLLECTION_PAGE_SIZE,
    });

    if (calculateOffset(page, pageSize) >= ARCHIVE_MAX_RESULTS) {
      return emptyPage<ContentCollection>(page, pageSize);
    }

    const text = normalizeText(paging.query ?? '');
    const query = buildQuery(text.length > 0 ? escapeLucene(text) : '', clauses);
    const sort = mapSort(paging.sort) ?? 'downloads desc';

    const response = await this.api.search(
      { query, page, pageSize, sort, fields: COLLECTION_DOCUMENT_FIELDS },
      this.requestOptions(options),
    );

    const collections: ContentCollection[] = [];

    for (const document of readDocuments(response, this.id)) {
      // The search already asked for containers. Extra `collection` memberships (community
      // media, fav-* lists, sibling collections) are not a parent-child tree — dropping a
      // document because of them emptied live category pages.
      if (!isArchiveCollection(document)) {
        continue;
      }

      const documentId = readIdentifier(document);

      if (documentId === '' || !this.membershipAllows(documentId, document)) {
        continue;
      }

      const categoryIds = this.categoriesFor(document, fallbackCategoryIds);
      const collection = mapCollection(
        { metadata: document, categoryIds, isCollection: true },
        this.api,
        this.id,
      );

      if (collection !== undefined) {
        collections.push(collection);
      }
    }

    const total = readTotal(response);

    return createPaginatedResult(collections, {
      page,
      pageSize,
      ...(total !== undefined ? { total } : {}),
    });
  }

  /**
   * Which of the interface's categories a collection belongs to.
   *
   * The Archive writes the whole ancestor chain into `collection`, media type included, so a
   * collection nested three levels deep is still placed under Software. The fallback covers
   * records whose ancestry the index did not include: the caller already knows which branch it
   * asked about.
   */
  private categoriesFor(
    metadata: Record<string, unknown>,
    fallback: readonly string[],
  ): readonly string[] {
    const ancestors = normalizeStringList(metadata['collection'], { maxItems: 24, maxLength: 80 });
    const matched = ancestors
      .map((ancestor) => findArchiveCategoryByCollection(ancestor, this.categoryCatalog)?.id)
      .filter((id): id is string => id !== undefined);

    return matched.length > 0 ? [...new Set(matched)] : fallback;
  }

  private toItemPage(
    response: ArchiveSearchResponse,
    page: number,
    pageSize: number,
    options: { readonly includeCollections?: boolean } = {},
  ): PaginatedResult<ContentItem> {
    const includeCollections = options.includeCollections === true;
    const items = readDocuments(response, this.id)
      .map((document) => mapItem({ metadata: document }, this.api, this.id))
      .filter((item): item is ContentItem => item !== undefined)
      .filter((item) => includeCollections || item.type !== 'collection')
      .filter((item) =>
        this.membershipAllows(item.id, {
          collection: item.metadata['collections'] ?? item.categories,
        }),
      );
    const total = readTotal(response);

    return createPaginatedResult(items, {
      page,
      pageSize,
      ...(total !== undefined ? { total } : {}),
    });
  }
}

function isCancelled(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { kind?: unknown }).kind === 'cancelled'
  );
}

export function createArchiveProvider(options: ArchiveProviderOptions = {}): ArchiveProvider {
  return new ArchiveProvider(options);
}
