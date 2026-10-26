/**
 * Wikipedia HTTP access (MediaWiki Action API).
 *
 * URLs, status-code translation, and JSON parsing live here. Timeouts, retries, and model
 * validation belong to the gateway. `origin=*` is required on every Action API URL so a
 * browser can read the response (MediaWiki CORS). Tests inject `fetch` and never call
 * wikipedia.org.
 */

import { attachProviderId, createAppError, toAppError, type AppError } from '../../models/errors';
import { WIKIPEDIA_MAX_BYTES, WIKIPEDIA_PROVIDER_ID } from './constants';

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

export const DEFAULT_WIKIPEDIA_API_HOST = 'https://en.wikipedia.org';

export interface WikipediaApiOptions {
  readonly host?: string;
  readonly fetchImpl?: Fetcher;
}

export interface WikipediaRequestOptions {
  readonly signal?: AbortSignal;
}

function providerError(
  kind: Parameters<typeof createAppError>[0],
  message: string,
  options: { readonly retryAfterMs?: number; readonly cause?: unknown } = {},
): AppError {
  return createAppError(kind, message, {
    providerId: WIKIPEDIA_PROVIDER_ID,
    ...(options.retryAfterMs !== undefined ? { retryAfterMs: options.retryAfterMs } : {}),
    ...(options.cause !== undefined ? { cause: options.cause } : {}),
  });
}

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

export function translateStatus(status: number, retryAfter: string | null): AppError {
  if (status === 429) {
    const retryAfterMs = parseRetryAfter(retryAfter);

    return providerError(
      'rate-limited',
      'Wikipedia is receiving too many requests from this client. Please try again shortly.',
      retryAfterMs !== undefined ? { retryAfterMs } : {},
    );
  }

  if (status === 404) {
    return providerError('not-found', 'The requested page does not exist on Wikipedia.');
  }

  if (status === 401 || status === 403) {
    return providerError('unauthorized', 'Wikipedia refused the request.');
  }

  if (status >= 500) {
    return providerError(
      'provider-unavailable',
      'Wikipedia is currently unavailable. Other providers are unaffected.',
    );
  }

  return providerError('unknown', `Wikipedia responded with HTTP ${status}.`);
}

function mediaWikiError(payload: Record<string, unknown>): AppError | undefined {
  const error = payload['error'];

  if (typeof error !== 'object' || error === null || Array.isArray(error)) {
    return undefined;
  }

  const record = error as Record<string, unknown>;
  const code = typeof record['code'] === 'string' ? record['code'] : '';
  const info =
    typeof record['info'] === 'string' && record['info'].trim() !== ''
      ? record['info']
      : 'Wikipedia rejected the request.';

  if (code === 'missingtitle' || code === 'invalidtitle' || code === 'missingparam') {
    return providerError('not-found', info);
  }

  if (code === 'ratelimited' || code === 'maxlag') {
    return providerError('rate-limited', info);
  }

  return providerError('invalid-response', info);
}

export class WikipediaApi {
  private readonly host: string;
  private readonly fetcher: Fetcher;

  constructor(options: WikipediaApiOptions = {}) {
    this.host = (options.host ?? DEFAULT_WIKIPEDIA_API_HOST).replace(/\/+$/, '');
    this.fetcher = options.fetchImpl ?? ((url, init) => fetch(url, init));
  }

  articleUrl(title: string): string {
    return `${this.host}/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
  }

  languageArticleUrl(lang: string, title: string): string {
    return `https://${encodeURIComponent(lang)}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
  }

  /** Every Action API URL includes `origin=*` so a browser CORS GET can read the body. */
  buildQueryUrl(params: Readonly<Record<string, string | number | undefined>>): string {
    const search = new URLSearchParams();

    search.set('origin', '*');
    search.set('format', 'json');
    search.set('formatversion', '2');
    search.set('action', 'query');

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) {
        continue;
      }

      search.set(key, String(value));
    }

    return `${this.host}/w/api.php?${search.toString()}`;
  }

  buildParseUrl(title: string): string {
    const search = new URLSearchParams();

    search.set('origin', '*');
    search.set('format', 'json');
    search.set('formatversion', '2');
    search.set('action', 'parse');
    search.set('page', title);
    search.set('redirects', '1');
    search.set('prop', 'text|sections|displaytitle');
    search.set('disableeditsection', '1');
    search.set('disablelimitreport', '1');

    return `${this.host}/w/api.php?${search.toString()}`;
  }

  async query(
    params: Readonly<Record<string, string | number | undefined>>,
    options: WikipediaRequestOptions = {},
  ): Promise<Record<string, unknown>> {
    return this.getJsonObject(this.buildQueryUrl(params), options);
  }

  async parse(
    title: string,
    options: WikipediaRequestOptions = {},
  ): Promise<Record<string, unknown>> {
    return this.getJsonObject(this.buildParseUrl(title), options);
  }

  private async getJsonObject(
    url: string,
    options: WikipediaRequestOptions,
  ): Promise<Record<string, unknown>> {
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
      throw attachProviderId(toAppError(error, 'network'), WIKIPEDIA_PROVIDER_ID);
    }

    if (!response.ok) {
      throw translateStatus(response.status, response.headers.get('retry-after'));
    }

    const lengthHeader = response.headers.get('content-length');
    const length = lengthHeader === null ? Number.NaN : Number(lengthHeader);

    if (Number.isFinite(length) && length > WIKIPEDIA_MAX_BYTES) {
      throw providerError(
        'invalid-response',
        'Wikipedia returned a payload larger than this app will download.',
      );
    }

    let payload: unknown;

    try {
      payload = await response.json();
    } catch (error) {
      throw providerError('invalid-response', 'The response was not valid JSON.', { cause: error });
    }

    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
      throw providerError('invalid-response', 'The response was not a JSON object.');
    }

    const record = payload as Record<string, unknown>;
    const apiError = mediaWikiError(record);

    if (apiError !== undefined) {
      throw apiError;
    }

    return record;
  }
}
