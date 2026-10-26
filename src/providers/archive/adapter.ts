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
 */

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
} from '../../models/provider';
import { normalizeStringList, normalizeText } from '../normalize';
import { ArchiveApi, type ArchiveRequestOptions, type Fetcher } from './api';
import { ARCHIVE_CATEGORIES, findArchiveCategory } from './catalog';
import {
  ARCHIVE_PROVIDER_ID,
  mapCollection,
  mapFiles,
  mapItem,
  readIdentifier,
  readItemAccess,
  readMetadataRecord,
} from './map';
import {
  buildCollectionClause,
  buildIdentifierClause,
  buildMediatypeClause,
  buildQuery,
  escapeLucene,
  mapSort,
} from './query';
import type { ArchiveMetadataResponse, ArchiveSearchResponse } from './types';

/**
 * The Archive refuses searches that reach past 10,000 documents. Reporting that ceiling as the
 * total keeps `hasMore` honest: without it the interface would keep offering "next page" for
 * results the provider will never return.
 */
export const ARCHIVE_MAX_RESULTS = 10_000;

/** Related items shown per item; enough for a row without a second request. */
export const ARCHIVE_RELATED_LIMIT = 12;

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

export interface ArchiveProviderOptions {
  /** Overrides the API base, e.g. for a proxy. */
  readonly host?: string;
  /** Injectable transport. Tests must never reach the network. */
  readonly fetchImpl?: Fetcher;
  /** Pre-built API client, which takes precedence over `host` and `fetchImpl`. */
  readonly api?: ArchiveApi;
}

function cancelledError(signal: AbortSignal | undefined): ReturnType<typeof createAppError> {
  return createAppError('cancelled', 'The request was cancelled.', {
    providerId: ARCHIVE_PROVIDER_ID,
    ...(signal?.reason !== undefined ? { cause: signal.reason } : {}),
  });
}

function invalidResponseError(message: string): ReturnType<typeof createAppError> {
  return createAppError('invalid-response', message, { providerId: ARCHIVE_PROVIDER_ID });
}

function notFoundError(message: string): ReturnType<typeof createAppError> {
  return createAppError('not-found', message, { providerId: ARCHIVE_PROVIDER_ID });
}

function emptyPage<T>(page: number, pageSize: number): PaginatedResult<T> {
  return { items: [], page, pageSize, hasMore: false };
}

/** A search body without a `docs` array is a provider defect, not an empty result. */
function readDocuments(response: ArchiveSearchResponse): readonly Record<string, unknown>[] {
  const docs = response.response?.docs;

  if (!Array.isArray(docs)) {
    throw invalidResponseError('The search response did not contain a document list.');
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
  readonly id = ARCHIVE_PROVIDER_ID;
  readonly name = 'Internet Archive';
  readonly version = '1.0.0';

  private readonly api: ArchiveApi;

  constructor(options: ArchiveProviderOptions = {}) {
    this.api =
      options.api ??
      new ArchiveApi({
        ...(options.host !== undefined ? { host: options.host } : {}),
        ...(options.fetchImpl !== undefined ? { fetchImpl: options.fetchImpl } : {}),
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
      // Nothing is streamed through the application: files are linked, and a viewer arrives in
      // a later phase (roadmap Phase 8).
      streaming: false,
      pagination: true,
      adultContent: false,
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
    await this.api.search({
      query: 'identifier:archive',
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
    // state instead (design spec 5.4).
    const mediatypeClause = buildMediatypeClause(options.contentTypes);

    if (text === '' && mediatypeClause === undefined) {
      return emptyPage<ContentItem>(page, pageSize);
    }

    if (calculateOffset(page, pageSize) >= ARCHIVE_MAX_RESULTS) {
      return emptyPage<ContentItem>(page, pageSize);
    }

    const sort = mapSort(options.sort);
    const response = await this.api.search(
      {
        query: buildQuery(text.length > 0 ? escapeLucene(text) : '', [mediatypeClause]),
        page,
        pageSize,
        ...(sort !== undefined ? { sort } : {}),
        fields: SEARCH_DOCUMENT_FIELDS,
      },
      this.requestOptions(options),
    );

    return this.toItemPage(response, page, pageSize);
  }

  async getCategories(options: ProviderRequestOptions = {}): Promise<readonly ContentCategory[]> {
    this.ensureActive(options.signal);

    // Categories are configuration, so this needs no request — but they still must not claim
    // artwork they do not have: the Archive answers the thumbnail service with a placeholder for
    // a collection without a cover, which keeps every card renderable.
    return ARCHIVE_CATEGORIES.map((category) => {
      const [primary] = category.collections;

      return {
        id: category.id,
        name: category.name,
        description: category.description,
        artworkUrl: this.api.thumbnailUrl(primary?.id ?? category.mediatype),
        providerId: ARCHIVE_PROVIDER_ID,
      };
    });
  }

  async getCollections(
    categoryId: string,
    options: BrowseOptions = {},
  ): Promise<PaginatedResult<ContentCollection>> {
    this.ensureActive(options.signal);

    const category = findArchiveCategory(categoryId);

    if (category === undefined) {
      throw notFoundError(
        `The Internet Archive category ${JSON.stringify(categoryId)} is not one this app offers.`,
      );
    }

    const { page, pageSize } = resolvePaginationOptions(options);
    const offset = calculateOffset(page, pageSize);
    const wanted = category.collections.slice(offset, offset + pageSize);
    const total = category.collections.length;

    if (wanted.length === 0) {
      return createPaginatedResult<ContentCollection>([], { page, pageSize, total });
    }

    // One request resolves the whole page: the catalogue supplies the identifiers and Archive
    // supplies the real titles and descriptions. A failed lookup is not fatal — the catalogue
    // fallback keeps the collection reachable.
    let documents: readonly Record<string, unknown>[] = [];

    try {
      const response = await this.api.search(
        {
          query: buildIdentifierClause(wanted.map((collection) => collection.id)),
          page: 1,
          pageSize: wanted.length,
          fields: COLLECTION_DOCUMENT_FIELDS,
        },
        this.requestOptions(options),
      );

      documents = readDocuments(response);
    } catch (error) {
      if (isCancelled(error)) {
        throw error;
      }

      documents = [];
    }

    const byIdentifier = new Map<string, Record<string, unknown>>();

    for (const document of documents) {
      const identifier = readIdentifier(document);

      if (identifier !== '') {
        byIdentifier.set(identifier, document);
      }
    }

    const collections = wanted
      .map((definition) => {
        const document = byIdentifier.get(definition.id);
        const metadata = document ?? { identifier: definition.id, title: definition.name };

        return mapCollection({ metadata, categoryIds: [category.id] }, this.api);
      })
      .filter((collection): collection is ContentCollection => collection !== undefined);

    return createPaginatedResult(collections, { page, pageSize, total });
  }

  async getCollection(
    collectionId: string,
    options: ProviderRequestOptions = {},
  ): Promise<ContentCollection> {
    this.ensureActive(options.signal);

    const identifier = this.requireIdentifier(collectionId, 'collection');
    const { metadata } = await this.loadItem(identifier, options);

    // A count needs its own request (`rows=0`). If it fails the collection is still worth showing,
    // so an item count is dropped rather than the page erroring.
    const itemCount = await this.fetchItemCount(identifier, options);
    const collection = mapCollection(
      { metadata, ...(itemCount !== undefined ? { itemCount } : {}) },
      this.api,
    );

    if (collection === undefined) {
      throw notFoundError(
        `The Internet Archive collection ${JSON.stringify(identifier)} has no metadata.`,
      );
    }

    return collection;
  }

  async getCollectionItems(
    collectionId: string,
    options: BrowseOptions = {},
  ): Promise<PaginatedResult<ContentItem>> {
    this.ensureActive(options.signal);

    const identifier = this.requireIdentifier(collectionId, 'collection');
    const { page, pageSize } = resolvePaginationOptions(options);

    if (calculateOffset(page, pageSize) >= ARCHIVE_MAX_RESULTS) {
      return emptyPage<ContentItem>(page, pageSize);
    }

    const text = normalizeText(options.query ?? '');
    const query = buildQuery(text.length > 0 ? escapeLucene(text) : '', [
      buildCollectionClause(identifier),
      buildMediatypeClause(options.contentTypes),
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
      },
      this.api,
    );

    if (item === undefined) {
      throw notFoundError(
        `The Internet Archive item ${JSON.stringify(identifier)} has no identifier.`,
      );
    }

    return item;
  }

  /**
   * Related items are the item's siblings inside its own collections.
   *
   * Preferences and history do not exist yet (roadmap Phase 7), so "related" is a provider-level
   * relationship rather than a personalised one, and the item itself is excluded client-side
   * because a Lucene negation is not worth an extra provider-specific query shape.
   */
  async getRelatedItems(
    itemId: string,
    options: ProviderRequestOptions = {},
  ): Promise<readonly ContentItem[]> {
    this.ensureActive(options.signal);

    const identifier = this.requireIdentifier(itemId, 'item');
    // A missing or withdrawn item is reported as such: "no related content" is a statement about
    // an item that exists, and returning an empty list would hide the real problem.
    const { metadata } = await this.loadItem(identifier, options);

    const collections = normalizeStringList(metadata['collection'], {
      maxItems: 3,
      maxLength: 120,
    }).filter((collection) => collection.toLowerCase() !== 'inlibrary');

    if (collections.length === 0) {
      return [];
    }

    const clause = collections.map((collection) => buildCollectionClause(collection)).join(' OR ');
    const search = await this.api.search(
      {
        query: `(${clause})`,
        page: 1,
        // One extra row, because the item under consideration is filtered out below.
        pageSize: ARCHIVE_RELATED_LIMIT + 1,
        sort: 'downloads desc',
        fields: SEARCH_DOCUMENT_FIELDS,
      },
      this.requestOptions(options),
    );

    const seen = new Set<string>([identifier]);
    const related: ContentItem[] = [];

    for (const document of readDocuments(search)) {
      const documentId = readIdentifier(document);

      if (documentId === '' || seen.has(documentId)) {
        continue;
      }

      const item = mapItem({ metadata: document }, this.api);

      if (item === undefined) {
        continue;
      }

      seen.add(documentId);
      related.push(item);

      if (related.length >= ARCHIVE_RELATED_LIMIT) {
        break;
      }
    }

    return related;
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
    return mapFiles(response.files, identifier, access, this.api);
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
      throw cancelledError(signal);
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
      throw notFoundError(`An Internet Archive ${kind} identifier is required.`);
    }

    return identifier;
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
      throw notFoundError(`The Internet Archive item ${JSON.stringify(identifier)} was not found.`);
    }

    if (response.is_dark === true) {
      throw notFoundError(
        `The Internet Archive item ${JSON.stringify(identifier)} is not publicly available.`,
      );
    }

    return { response, metadata };
  }

  private async fetchItemCount(
    identifier: string,
    options: ProviderRequestOptions,
  ): Promise<number | undefined> {
    try {
      return await this.api.count(buildCollectionClause(identifier), this.requestOptions(options));
    } catch (error) {
      if (isCancelled(error)) {
        throw error;
      }

      return undefined;
    }
  }

  private toItemPage(
    response: ArchiveSearchResponse,
    page: number,
    pageSize: number,
  ): PaginatedResult<ContentItem> {
    const items = readDocuments(response)
      .map((document) => mapItem({ metadata: document }, this.api))
      .filter((item): item is ContentItem => item !== undefined);
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
