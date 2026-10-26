import { describe, expect, it } from 'vitest';
import { DEFAULT_WIKIPEDIA_API_HOST, WikipediaApi, translateStatus } from './api';
import {
  MEDIAWIKI_ERROR,
  SEARCH_PAGES,
  createFetchStub,
  jsonResponse,
  malformedResponse,
  requestUrl,
} from './fixtures';

function createApi(handler: Parameters<typeof createFetchStub>[0]) {
  const stub = createFetchStub(handler);

  return { api: new WikipediaApi({ fetchImpl: stub.fetcher }), stub };
}

describe('WikipediaApi URLs', () => {
  it('puts origin=* on every Action API URL so a browser can read the response', async () => {
    const { api, stub } = createApi(() => jsonResponse(SEARCH_PAGES));

    await api.query({ titles: 'Ada Lovelace', prop: 'info' });

    const url = requestUrl(stub);

    expect(url.origin).toBe(DEFAULT_WIKIPEDIA_API_HOST);
    expect(url.pathname).toBe('/w/api.php');
    expect(url.searchParams.get('origin')).toBe('*');
    expect(url.searchParams.get('format')).toBe('json');
    expect(url.searchParams.get('formatversion')).toBe('2');
    expect(url.searchParams.get('action')).toBe('query');
    expect(url.searchParams.get('titles')).toBe('Ada Lovelace');
  });

  it('builds parse URLs with redirects and without edit-section chrome', () => {
    const api = new WikipediaApi();
    const url = new URL(api.buildParseUrl('Ada Lovelace'));

    expect(url.searchParams.get('origin')).toBe('*');
    expect(url.searchParams.get('action')).toBe('parse');
    expect(url.searchParams.get('page')).toBe('Ada Lovelace');
    expect(url.searchParams.get('redirects')).toBe('1');
    expect(url.searchParams.get('disableeditsection')).toBe('1');
  });

  it('encodes article URLs', () => {
    const api = new WikipediaApi();

    expect(api.articleUrl('Ada Lovelace')).toBe('https://en.wikipedia.org/wiki/Ada_Lovelace');
    expect(api.languageArticleUrl('it', 'Ada Lovelace')).toBe(
      'https://it.wikipedia.org/wiki/Ada_Lovelace',
    );
  });
});

describe('WikipediaApi errors', () => {
  it('translates HTTP status codes', () => {
    expect(translateStatus(404, null).kind).toBe('not-found');
    expect(translateStatus(429, '2').kind).toBe('rate-limited');
    expect(translateStatus(503, null).kind).toBe('provider-unavailable');
  });

  it('surfaces a MediaWiki error object returned with HTTP 200', async () => {
    const { api } = createApi(() => jsonResponse(MEDIAWIKI_ERROR));

    await expect(api.query({ titles: 'Missing' })).rejects.toMatchObject({ kind: 'not-found' });
  });

  it('rejects a truncated body', async () => {
    const { api } = createApi(() => malformedResponse());

    await expect(api.query({ titles: 'Ada Lovelace' })).rejects.toMatchObject({
      kind: 'invalid-response',
    });
  });

  it('refuses a payload whose Content-Length exceeds the cap', async () => {
    const { api } = createApi(() =>
      jsonResponse(SEARCH_PAGES, { headers: { 'content-length': String(5 * 1024 * 1024) } }),
    );

    await expect(api.query({ titles: 'Ada Lovelace' })).rejects.toMatchObject({
      kind: 'invalid-response',
    });
  });
});
