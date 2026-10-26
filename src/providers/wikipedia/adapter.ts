/**
 * Wikipedia provider (design specification 12, roadmap Phase 13).
 *
 * The adapter talks only to the MediaWiki Action API with `origin=*` so a browser can read
 * the responses. It never downloads article HTML to render a card — summaries and thumbnails
 * are enough for discovery. Full HTML is fetched by the article reader when the reader opens.
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
import { normalizeText } from '../normalize';
import { WikipediaApi, type Fetcher, type WikipediaRequestOptions } from './api';
import { findWikipediaCategory, WIKIPEDIA_CATEGORIES } from './catalog';
import {
  WIKIPEDIA_ARTICLE_FILE_ID,
  WIKIPEDIA_PROVIDER_ID,
  WIKIPEDIA_SEARCH_LIMIT,
} from './constants';
import {
  categoryTitle,
  isMissingPage,
  itemIdToTitle,
  mapArticleFile,
  mapCollectionFromTitle,
  mapPageRecord,
  mapSearchHit,
  readCategoryMembers,
  readContinueToken,
  readLangLinks,
  readMostViewedTitles,
  readQueryPages,
  readSearchHits,
  readSearchTotal,
  titleToItemId,
} from './map';

export interface WikipediaProviderOptions {
  readonly host?: string;
  readonly fetchImpl?: Fetcher;
  readonly api?: WikipediaApi;
}

function cancelledError(signal: AbortSignal | undefined): ReturnType<typeof createAppError> {
  return createAppError('cancelled', 'The request was cancelled.', {
    providerId: WIKIPEDIA_PROVIDER_ID,
    ...(signal?.reason !== undefined ? { cause: signal.reason } : {}),
  });
}

function notFoundError(message: string): ReturnType<typeof createAppError> {
  return createAppError('not-found', message, { providerId: WIKIPEDIA_PROVIDER_ID });
}

function emptyPage<T>(page: number, pageSize: number): PaginatedResult<T> {
  return createPaginatedResult<T>([], { page, pageSize, total: 0 });
}

function searchLimit(pageSize: number): number {
  return Math.min(pageSize, WIKIPEDIA_SEARCH_LIMIT);
}

function incategoryClause(title: string, extra: string): string {
  const quoted = `"${categoryTitle(title).replace(/"/g, '')}"`;
  const suffix = extra.trim();

  return suffix.length > 0 ? `incategory:${quoted} ${suffix}` : `incategory:${quoted}`;
}

export class WikipediaProvider implements ContentProvider {
  readonly id = WIKIPEDIA_PROVIDER_ID;
  readonly name = 'Wikipedia';
  readonly version = '1.0.0';

  private readonly api: WikipediaApi;

  constructor(options: WikipediaProviderOptions = {}) {
    this.api =
      options.api ??
      new WikipediaApi({
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
      subcollections: true,
      streaming: false,
      pagination: true,
      adultContent: false,
      contentTypes: ['article'],
    });
  }

  async checkHealth(): Promise<boolean> {
    await this.api.query({ titles: 'Main Page', prop: 'info' });

    return true;
  }

  async search(query: string, options: SearchOptions = {}): Promise<PaginatedResult<ContentItem>> {
    this.ensureActive(options.signal);

    const { page, pageSize } = resolvePaginationOptions(options);
    const types = options.contentTypes;

    if (
      types !== undefined &&
      types.length > 0 &&
      !types.includes('article') &&
      !types.includes('document')
    ) {
      return emptyPage(page, pageSize);
    }

    const text = normalizeText(query);

    if (text === '') {
      return this.mostViewed(page, pageSize, options);
    }

    return this.searchPages(text, page, pageSize, options);
  }

  async getCategories(options: ProviderRequestOptions = {}): Promise<readonly ContentCategory[]> {
    this.ensureActive(options.signal);

    return WIKIPEDIA_CATEGORIES.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      providerId: WIKIPEDIA_PROVIDER_ID,
    }));
  }

  async getCollections(
    categoryId: string,
    options: BrowseOptions = {},
  ): Promise<PaginatedResult<ContentCollection>> {
    this.ensureActive(options.signal);

    const category = findWikipediaCategory(categoryId);

    if (category === undefined) {
      throw notFoundError(
        `The Wikipedia category ${JSON.stringify(categoryId)} is not one this app offers.`,
      );
    }

    return this.subcategories(category.wikipediaTitle, category.id, options);
  }

  async getSubcollections(
    collectionId: string,
    options: BrowseOptions = {},
  ): Promise<PaginatedResult<ContentCollection>> {
    this.ensureActive(options.signal);

    return this.subcategories(categoryTitle(collectionId), undefined, options);
  }

  async getCollection(
    collectionId: string,
    options: ProviderRequestOptions = {},
  ): Promise<ContentCollection> {
    this.ensureActive(options.signal);

    const title = categoryTitle(collectionId);
    const payload = await this.api.query(
      {
        titles: `Category:${title}`,
        prop: 'categoryinfo|info|extracts',
        exintro: 1,
        explaintext: 1,
        inprop: 'url',
      },
      this.requestOptions(options),
    );

    if (isMissingPage(payload)) {
      throw notFoundError(`Wikipedia has no category named ${JSON.stringify(title)}.`);
    }

    const page = readQueryPages(payload)[0];
    const info =
      page === undefined
        ? undefined
        : (page['categoryinfo'] as Record<string, unknown> | undefined);
    const pages =
      info !== undefined && typeof info['pages'] === 'number'
        ? Math.max(0, Math.trunc(info['pages']))
        : undefined;
    const catalog = findWikipediaCategory(title);

    return mapCollectionFromTitle(title, {
      sourceUrl:
        (page !== undefined && typeof page['fullurl'] === 'string' ? page['fullurl'] : undefined) ??
        this.api.articleUrl(`Category:${title}`),
      ...(page !== undefined && typeof page['extract'] === 'string'
        ? { description: page['extract'] }
        : catalog !== undefined
          ? { description: catalog.description }
          : {}),
      ...(pages !== undefined ? { itemCount: pages } : {}),
      categoryIds: catalog !== undefined ? [catalog.id] : [],
    });
  }

  async getCollectionItems(
    collectionId: string,
    options: BrowseOptions = {},
  ): Promise<PaginatedResult<ContentItem>> {
    this.ensureActive(options.signal);

    const { page, pageSize } = resolvePaginationOptions(options);
    const types = options.contentTypes;

    if (
      types !== undefined &&
      types.length > 0 &&
      !types.includes('article') &&
      !types.includes('document')
    ) {
      return emptyPage(page, pageSize);
    }

    const title = categoryTitle(collectionId);
    const extra = normalizeText(options.query ?? '');

    return this.searchPages(incategoryClause(title, extra), page, pageSize, options);
  }

  async getItem(itemId: string, options: ProviderRequestOptions = {}): Promise<ContentItem> {
    this.ensureActive(options.signal);

    const title = itemIdToTitle(itemId);
    const payload = await this.api.query(
      {
        titles: title,
        redirects: 1,
        prop: 'extracts|pageimages|info|categories|langlinks|description',
        exintro: 1,
        explaintext: 1,
        pithumbsize: 400,
        inprop: 'url',
        cllimit: 12,
        lllimit: 20,
        llprop: 'url',
      },
      this.requestOptions(options),
    );

    if (isMissingPage(payload) || readQueryPages(payload).length === 0) {
      throw notFoundError(`Wikipedia has no article named ${JSON.stringify(title)}.`);
    }

    const page = readQueryPages(payload)[0];

    if (page === undefined) {
      throw notFoundError(`Wikipedia has no article named ${JSON.stringify(title)}.`);
    }

    const item = mapPageRecord(page, this.api);
    const langlinks = readLangLinks(page, this.api);

    if (langlinks.length === 0) {
      return item;
    }

    return {
      ...item,
      metadata: { ...item.metadata, langlinks },
    };
  }

  async getRelatedItems(
    itemId: string,
    options: BrowseOptions = {},
  ): Promise<PaginatedResult<ContentItem>> {
    this.ensureActive(options.signal);

    const { page, pageSize } = resolvePaginationOptions(options);
    const title = itemIdToTitle(itemId);

    return this.searchPages(`morelike:${title}`, page, pageSize, options);
  }

  async getAvailableFiles(
    itemId: string,
    options: ProviderRequestOptions = {},
  ): Promise<readonly ContentFile[]> {
    const item = await this.getItem(itemId, options);

    return [mapArticleFile(item)];
  }

  async getDownloadUrl(
    itemId: string,
    fileId: string,
    options: ProviderRequestOptions = {},
  ): Promise<string | null> {
    this.ensureActive(options.signal);

    if (fileId !== WIKIPEDIA_ARTICLE_FILE_ID) {
      return null;
    }

    return this.api.articleUrl(titleToItemId(itemIdToTitle(itemId)));
  }

  private async mostViewed(
    page: number,
    pageSize: number,
    options: ProviderRequestOptions,
  ): Promise<PaginatedResult<ContentItem>> {
    const limit = searchLimit(pageSize);
    const offset = calculateOffset(page, pageSize);
    const payload = await this.api.query(
      { list: 'mostviewed', pvimlimit: Math.min(offset + limit, 50) },
      this.requestOptions(options),
    );
    const titles = readMostViewedTitles(payload).slice(offset, offset + limit);

    if (titles.length === 0) {
      return this.searchPages('incategory:"Featured_articles"', page, pageSize, options);
    }

    const items = titles.map((title) =>
      mapSearchHit({ title, canonicalUrl: this.api.articleUrl(titleToItemId(title)) }, this.api),
    );

    const remaining = readMostViewedTitles(payload).length > offset + items.length;

    return createPaginatedResult(items, {
      page,
      pageSize,
      ...(remaining ? { nextCursor: 'more' } : {}),
    });
  }

  private async searchPages(
    search: string,
    page: number,
    pageSize: number,
    options: SearchOptions,
  ): Promise<PaginatedResult<ContentItem>> {
    const limit = searchLimit(pageSize);
    const offset = calculateOffset(page, pageSize);
    const sort = mapSearchSort(options.sort);
    const payload = await this.api.query(
      {
        generator: 'search',
        gsrsearch: search,
        gsrlimit: limit,
        gsroffset: offset,
        gsrnamespace: 0,
        ...(sort !== undefined ? { gsrsort: sort } : {}),
        prop: 'extracts|pageimages|info|description',
        exintro: 1,
        explaintext: 1,
        exlimit: 'max',
        pithumbsize: 320,
        inprop: 'url',
      },
      this.requestOptions(options),
    );

    const { items } = readSearchHits(payload, this.api);
    const total = readSearchTotal(payload);
    const next = readContinueToken(payload, 'gsroffset');

    return createPaginatedResult(items, {
      page,
      pageSize,
      ...(total !== undefined ? { total } : {}),
      ...(next !== undefined ? { nextCursor: next } : {}),
    });
  }

  private async subcategories(
    wikipediaTitle: string,
    catalogId: string | undefined,
    options: BrowseOptions,
  ): Promise<PaginatedResult<ContentCollection>> {
    const { page, pageSize } = resolvePaginationOptions(options);
    const payload = await this.walkCategoryMembers(
      wikipediaTitle,
      'subcat',
      page,
      pageSize,
      options,
    );
    const titles = readCategoryMembers(payload.body, 'subcat');
    const collections = titles.map((title) =>
      mapCollectionFromTitle(title, {
        sourceUrl: this.api.articleUrl(`Category:${title}`),
        categoryIds: catalogId !== undefined ? [catalogId] : [],
      }),
    );

    return createPaginatedResult(collections, {
      page,
      pageSize,
      ...(payload.continueToken !== undefined ? { nextCursor: payload.continueToken } : {}),
    });
  }

  private async walkCategoryMembers(
    wikipediaTitle: string,
    type: 'subcat' | 'page',
    page: number,
    pageSize: number,
    options: ProviderRequestOptions,
  ): Promise<{ readonly body: Record<string, unknown>; readonly continueToken?: string }> {
    let continueToken: string | undefined;
    let current = 1;
    let body: Record<string, unknown> = {};

    while (current <= page) {
      body = await this.api.query(
        {
          list: 'categorymembers',
          cmtitle: `Category:${categoryTitle(wikipediaTitle)}`,
          cmtype: type,
          cmlimit: searchLimit(pageSize),
          ...(continueToken !== undefined ? { cmcontinue: continueToken } : {}),
        },
        this.requestOptions(options),
      );

      const next = readContinueToken(body, 'cmcontinue');

      if (current === page) {
        return { body, ...(next !== undefined ? { continueToken: next } : {}) };
      }

      if (next === undefined) {
        return { body: { query: { categorymembers: [] } } };
      }

      continueToken = next;
      current += 1;
    }

    return { body };
  }

  private requestOptions(options: ProviderRequestOptions): WikipediaRequestOptions {
    return options.signal !== undefined ? { signal: options.signal } : {};
  }

  private ensureActive(signal: AbortSignal | undefined): void {
    if (signal?.aborted === true) {
      throw cancelledError(signal);
    }
  }
}

function mapSearchSort(sort: SearchOptions['sort']): string | undefined {
  if (sort === 'date-desc' || sort === 'added-desc') {
    return 'last_edit_desc';
  }

  if (sort === 'date-asc') {
    return 'last_edit_asc';
  }

  return undefined;
}

export function createWikipediaProvider(options: WikipediaProviderOptions = {}): WikipediaProvider {
  return new WikipediaProvider(options);
}
