/**
 * Internet Archive HTTP access.
 *
 * This module owns URLs, status-code translation, and response parsing — nothing else. It does
 * not retry, time out, or validate models: the gateway and reliability layer do that, and the
 * mapping layer turns payloads into shared models.
 *
 * `fetch` is injectable so tests exercise the real request-building and error translation
 * without a network. Tests must never call archive.org.
 */

import { attachProviderId, createAppError, toAppError, type AppError } from '../../models/errors';
import type { ArchiveMetadataResponse, ArchiveSearchResponse } from './types';

/** The subset of `Response` this client needs, so tests need no DOM globals. */
export interface HttpResponseLike {
  readonly ok: boolean;
  readonly status: number;
  readonly headers: { get(name: string): string | null };
  json(): Promise<unknown>;
}

export type Fetcher = (
  url: string,
  init: { readonly signal?: AbortSignal },
) => Promise<HttpResponseLike>;

export const DEFAULT_ARCHIVE_HOST = 'https://archive.org';

export interface ArchiveApiOptions {
  readonly host?: string;
  readonly fetchImpl?: Fetcher;
}

export interface ArchiveRequestOptions {
  readonly signal?: AbortSignal;
}

export interface ArchiveSearchParameters {
  readonly query: string;
  readonly page: number;
  readonly pageSize: number;
  /** Archive sort expression, e.g. `date desc`. Omitted means relevance order. */
  readonly sort?: string;
  readonly fields?: readonly string[];
}

/** Fields requested for every search. Enough to render a card without a second request. */
export const SEARCH_FIELDS: readonly string[] = [
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

/**
 * Parse `Retry-After`, which may be a number of seconds or an HTTP date. Returns milliseconds so
 * the reliability layer can honour it directly.
 */
export function parseRetryAfter(
  header: string | null,
  now: number = Date.now(),
): number | undefined {
  if (header === null || header.trim() === '') {
    return undefined;
  }

  const seconds = Number(header);

  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1000);
  }

  const date = Date.parse(header);

  if (Number.isNaN(date)) {
    return undefined;
  }

  return Math.max(0, date - now);
}

function providerError(
  kind: Parameters<typeof createAppError>[0],
  message: string,
  options: { readonly retryAfterMs?: number; readonly cause?: unknown } = {},
): AppError {
  return createAppError(kind, message, {
    providerId: 'archive',
    ...(options.retryAfterMs !== undefined ? { retryAfterMs: options.retryAfterMs } : {}),
    ...(options.cause !== undefined ? { cause: options.cause } : {}),
  });
}

/** Translate a non-success status into an `AppError` the reliability layer understands. */
export function translateStatus(status: number, retryAfter: string | null): AppError {
  if (status === 429) {
    const retryAfterMs = parseRetryAfter(retryAfter);

    return providerError(
      'rate-limited',
      'The Internet Archive is receiving too many requests from this client. Please try again shortly.',
      retryAfterMs !== undefined ? { retryAfterMs } : {},
    );
  }

  if (status === 404) {
    return providerError('not-found', 'The requested item does not exist on the Internet Archive.');
  }

  if (status === 401 || status === 403) {
    return providerError(
      'unauthorized',
      'The Internet Archive refused the request. This item may be restricted.',
    );
  }

  if (status >= 500) {
    return providerError(
      'provider-unavailable',
      'The Internet Archive is currently unavailable. Other providers are unaffected.',
    );
  }

  return providerError('unknown', `The Internet Archive responded with HTTP ${status}.`);
}

export class ArchiveApi {
  private readonly host: string;
  private readonly fetcher: Fetcher;

  constructor(options: ArchiveApiOptions = {}) {
    this.host = (options.host ?? DEFAULT_ARCHIVE_HOST).replace(/\/+$/, '');
    this.fetcher = options.fetchImpl ?? ((url, init) => fetch(url, init));
  }

  /** Absolute URL of an item's public page, used for attribution. */
  detailsUrl(identifier: string): string {
    return `${this.host}/details/${encodeURIComponent(identifier)}`;
  }

  /**
   * Thumbnail service URL. Archive answers with a placeholder image for items without artwork,
   * so this is always safe to render and never needs a pre-flight existence check.
   */
  thumbnailUrl(identifier: string): string {
    return `${this.host}/services/img/${encodeURIComponent(identifier)}`;
  }

  /** Direct download URL for a file within an item. */
  downloadUrl(identifier: string, fileName: string): string {
    return `${this.host}/download/${encodeURIComponent(identifier)}/${encodeURIComponent(fileName)}`;
  }

  /** Build the advanced-search query string. Exported behaviour is asserted in tests. */
  buildSearchUrl(parameters: ArchiveSearchParameters): string {
    const search = new URLSearchParams();

    search.set('q', parameters.query);
    search.set('rows', String(parameters.pageSize));
    search.set('page', String(parameters.page));
    search.set('output', 'json');

    for (const field of parameters.fields ?? SEARCH_FIELDS) {
      search.append('fl[]', field);
    }

    if (parameters.sort !== undefined && parameters.sort.length > 0) {
      search.append('sort[]', parameters.sort);
    }

    return `${this.host}/advancedsearch.php?${search.toString()}`;
  }

  async search(
    parameters: ArchiveSearchParameters,
    options: ArchiveRequestOptions = {},
  ): Promise<ArchiveSearchResponse> {
    const payload = await this.getJsonObject(this.buildSearchUrl(parameters), options);

    return payload as ArchiveSearchResponse;
  }

  async getMetadata(
    identifier: string,
    options: ArchiveRequestOptions = {},
  ): Promise<ArchiveMetadataResponse> {
    const payload = await this.getJsonObject(
      `${this.host}/metadata/${encodeURIComponent(identifier)}`,
      options,
    );

    return payload as ArchiveMetadataResponse;
  }

  /**
   * `numFound` for a query without transferring any documents (`rows=0`).
   *
   * Used where only a count is needed — a collection's item total — because fetching a page of
   * documents to discard them would cost the Archive work for nothing.
   */
  async count(query: string, options: ArchiveRequestOptions = {}): Promise<number | undefined> {
    const search = new URLSearchParams({ q: query, rows: '0', page: '1', output: 'json' });
    const payload = await this.getJsonObject(
      `${this.host}/advancedsearch.php?${search.toString()}`,
      options,
    );
    const numFound = (payload as ArchiveSearchResponse).response?.numFound;

    return typeof numFound === 'number' && Number.isFinite(numFound) && numFound >= 0
      ? Math.trunc(numFound)
      : undefined;
  }

  private async getJsonObject(
    url: string,
    options: ArchiveRequestOptions,
  ): Promise<Record<string, unknown>> {
    const payload = await this.getJson(url, options);

    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
      throw providerError('invalid-response', 'The response was not a JSON object.');
    }

    return payload as Record<string, unknown>;
  }

  private async getJson(url: string, options: ArchiveRequestOptions): Promise<unknown> {
    // Check before dispatch: a request started for an already-cancelled caller is wasted work and
    // a wasted request against a provider that rate-limits by client.
    if (options.signal?.aborted === true) {
      throw providerError('cancelled', 'The request was cancelled.', {
        cause: options.signal.reason,
      });
    }

    let response: HttpResponseLike;

    try {
      response = await this.fetcher(
        url,
        options.signal !== undefined ? { signal: options.signal } : {},
      );
    } catch (error) {
      // Aborts become `cancelled`; anything else is a transport failure worth retrying. The
      // provider id is stamped here so a failure that never reached the gateway still names the
      // provider that failed.
      throw attachProviderId(toAppError(error, 'network'), 'archive');
    }

    if (!response.ok) {
      throw translateStatus(response.status, response.headers.get('retry-after'));
    }

    try {
      return await response.json();
    } catch (error) {
      // A truncated or non-JSON body is a provider defect, not a network failure.
      throw providerError('invalid-response', 'The response was not valid JSON.', { cause: error });
    }
  }
}
