import { describe, expect, it } from 'vitest';
import {
  ArchiveApi,
  DEFAULT_ARCHIVE_HOST,
  SEARCH_FIELDS,
  parseRetryAfter,
  translateStatus,
} from './api';
import {
  COUNT_RESPONSE,
  EMPTY_RESPONSE,
  SEARCH_RESPONSE,
  createFetchStub,
  firstRequest,
  jsonResponse,
  malformedResponse,
  requestUrl,
} from './fixtures';

function createApi(handler: Parameters<typeof createFetchStub>[0]) {
  const stub = createFetchStub(handler);

  return { api: new ArchiveApi({ fetchImpl: stub.fetcher }), stub };
}

describe('ArchiveApi URLs', () => {
  it('builds a complete advanced-search request', async () => {
    const { api, stub } = createApi(() => jsonResponse(SEARCH_RESPONSE));

    await api.search({ query: 'vampire', page: 3, pageSize: 24, sort: 'date desc' });

    const url = requestUrl(stub);

    expect(url.origin).toBe(DEFAULT_ARCHIVE_HOST);
    expect(url.pathname).toBe('/advancedsearch.php');
    expect(url.searchParams.get('q')).toBe('vampire');
    expect(url.searchParams.get('rows')).toBe('24');
    expect(url.searchParams.get('page')).toBe('3');
    expect(url.searchParams.get('output')).toBe('json');
    expect(url.searchParams.getAll('fl[]')).toEqual([...SEARCH_FIELDS]);
    expect(url.searchParams.getAll('sort[]')).toEqual(['date desc']);
  });

  it('omits the sort clause when no order was requested', async () => {
    const { api, stub } = createApi(() => jsonResponse(SEARCH_RESPONSE));

    await api.search({ query: 'vampire', page: 1, pageSize: 10 });

    expect(requestUrl(stub).searchParams.getAll('sort[]')).toEqual([]);
  });

  it('honours an explicit field list', async () => {
    const { api, stub } = createApi(() => jsonResponse(EMPTY_RESPONSE));

    await api.search({ query: 'x', page: 1, pageSize: 1, fields: ['identifier'] });

    expect(requestUrl(stub).searchParams.getAll('fl[]')).toEqual(['identifier']);
  });

  it('builds encoded item, thumbnail, download, and source URLs', () => {
    const api = new ArchiveApi();

    expect(api.getMetadata).toBeTypeOf('function');
    expect(api.detailsUrl('nos feratu')).toBe('https://archive.org/details/nos%20feratu');
    expect(api.thumbnailUrl('nosferatu')).toBe('https://archive.org/services/img/nosferatu');
    expect(api.downloadUrl('nosferatu', 'a b/c.mp4')).toBe(
      'https://archive.org/download/nosferatu/a%20b%2Fc.mp4',
    );
  });

  it('uses a custom host without a trailing slash', async () => {
    const stub = createFetchStub(() => jsonResponse({}));
    const api = new ArchiveApi({ host: 'https://mirror.test/', fetchImpl: stub.fetcher });

    await api.getMetadata('abc');

    expect(requestUrl(stub).origin).toBe('https://mirror.test');
  });
});

describe('ArchiveApi responses', () => {
  it('parses a search payload', async () => {
    const { api } = createApi(() => jsonResponse(SEARCH_RESPONSE));
    const response = await api.search({ query: 'vampire', page: 1, pageSize: 10 });

    expect(response.response?.numFound).toBe(1284);
  });

  it('reads numFound from a rows=0 count without requesting documents', async () => {
    const { api, stub } = createApi(() => jsonResponse(COUNT_RESPONSE));

    await expect(api.count('collection:feature_films')).resolves.toBe(4210);
    expect(requestUrl(stub).searchParams.get('rows')).toBe('0');
    expect(requestUrl(stub).searchParams.get('q')).toBe('collection:feature_films');
  });

  it('reports an unusable count as unknown rather than zero', async () => {
    const { api } = createApi(() => jsonResponse(EMPTY_RESPONSE));

    await expect(api.count('collection:x')).resolves.toBeUndefined();
  });

  it('rejects a search payload that is not an object', async () => {
    const { api } = createApi(() => jsonResponse([1, 2, 3]));

    await expect(api.search({ query: 'x', page: 1, pageSize: 1 })).rejects.toMatchObject({
      kind: 'invalid-response',
      providerId: 'archive',
    });
  });

  it('reports unparseable bodies as an invalid response, not a transport failure', async () => {
    const { api } = createApi(() => malformedResponse());

    await expect(api.getMetadata('abc')).rejects.toMatchObject({ kind: 'invalid-response' });
  });

  it('classifies a transport failure as a network error', async () => {
    const { api } = createApi(() => Promise.reject(new TypeError('Failed to fetch')));

    await expect(api.getMetadata('abc')).rejects.toMatchObject({
      kind: 'network',
      providerId: 'archive',
    });
  });

  it('classifies an aborted request as cancelled', async () => {
    const { api } = createApi(() =>
      Promise.reject(new DOMException('The operation was aborted.', 'AbortError')),
    );

    await expect(api.getMetadata('abc')).rejects.toMatchObject({ kind: 'cancelled' });
  });

  it('does not dispatch a request for an already-aborted caller', async () => {
    const { api, stub } = createApi(() => jsonResponse(SEARCH_RESPONSE));
    const controller = new AbortController();
    controller.abort();

    await expect(
      api.search({ query: 'x', page: 1, pageSize: 1 }, { signal: controller.signal }),
    ).rejects.toMatchObject({ kind: 'cancelled' });
    expect(stub.requests).toHaveLength(0);
  });

  it('forwards the abort signal to the transport', async () => {
    const { api, stub } = createApi(() => jsonResponse(EMPTY_RESPONSE));
    const controller = new AbortController();

    await api.getMetadata('abc', { signal: controller.signal });

    expect(firstRequest(stub).signal).toBe(controller.signal);
  });
});

describe('status translation', () => {
  it('turns 429 into a rate limit that honours Retry-After seconds', () => {
    const error = translateStatus(429, '30');

    expect(error.kind).toBe('rate-limited');
    expect(error.retryAfterMs).toBe(30_000);
    expect(error.providerId).toBe('archive');
  });

  it('turns 429 with an HTTP-date Retry-After into a delay', () => {
    const error = translateStatus(429, new Date(Date.now() + 60_000).toUTCString());

    expect(error.kind).toBe('rate-limited');
    expect(error.retryAfterMs).toBeGreaterThan(50_000);
    expect(error.retryAfterMs).toBeLessThanOrEqual(60_000);
  });

  it('omits the delay when Retry-After is unusable', () => {
    expect(translateStatus(429, null).retryAfterMs).toBeUndefined();
    expect(translateStatus(429, 'soon').retryAfterMs).toBeUndefined();
  });

  it.each([
    [404, 'not-found'],
    [403, 'unauthorized'],
    [401, 'unauthorized'],
    [500, 'provider-unavailable'],
    [503, 'provider-unavailable'],
    [400, 'unknown'],
  ] as const)('maps HTTP %i to %s', (status, kind) => {
    expect(translateStatus(status, null).kind).toBe(kind);
  });
});

describe('parseRetryAfter', () => {
  it('reads seconds, tolerating whitespace', () => {
    expect(parseRetryAfter('120')).toBe(120_000);
    expect(parseRetryAfter('  30 ')).toBe(30_000);
    expect(parseRetryAfter('0')).toBe(0);
  });

  it('returns undefined for absent or malformed values', () => {
    expect(parseRetryAfter(null)).toBeUndefined();
    expect(parseRetryAfter('')).toBeUndefined();
    expect(parseRetryAfter('   ')).toBeUndefined();
    expect(parseRetryAfter('later')).toBeUndefined();
  });

  it('converts an HTTP-date to a non-negative delay', () => {
    const now = Date.parse('2026-10-25T12:00:00Z');
    const header = new Date(now + 45_000).toUTCString();

    expect(parseRetryAfter(header, now)).toBe(45_000);
    expect(parseRetryAfter(new Date(now - 45_000).toUTCString(), now)).toBe(0);
  });
});
