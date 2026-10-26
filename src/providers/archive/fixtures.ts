/**
 * Archive payload fixtures and transport stubs for tests.
 *
 * These are **not** recorded from a live archive.org session. The development sandbox has no route
 * to archive.org, so the payloads are written to the documented response shapes — including the
 * details that actually bite: sizes as decimal strings, `creator`/`collection` as either a string
 * or an array, HTML in `description`, a numeric `year`, administrative `_metadata` files mixed in
 * with content, and unknown identifiers answering `{}` instead of `404`.
 *
 * Nothing here imports application code, so it is never bundled. Tests use these through the
 * injected `Fetcher`; no test opens a network connection.
 */

import type { Fetcher, HttpResponseLike } from './api';

export interface StubResponseInit {
  readonly status?: number;
  readonly headers?: Readonly<Record<string, string>>;
}

/** A JSON response with the small `Response` surface the API client uses. */
export function jsonResponse(body: unknown, init: StubResponseInit = {}): HttpResponseLike {
  const status = init.status ?? 200;
  const headers = new Map<string, string>(
    Object.entries(init.headers ?? {}).map(([name, value]) => [name.toLowerCase(), value]),
  );

  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers.get(name.toLowerCase()) ?? null },
    json: () => Promise.resolve(body),
  };
}

/** A response whose body cannot be parsed, e.g. an HTML error page served with status 200. */
export function malformedResponse(status = 200): HttpResponseLike {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: () => Promise.reject(new SyntaxError('Unexpected token < in JSON at position 0')),
  };
}

export interface RecordedRequest {
  readonly url: string;
  readonly signal: AbortSignal | undefined;
}

export interface FetchStub {
  readonly fetcher: Fetcher;
  readonly requests: readonly RecordedRequest[];
  /** Path + query of every request, without the host, for order-insensitive assertions. */
  readonly paths: readonly string[];
}

export type FetchHandler = (
  url: string,
  init: { readonly signal?: AbortSignal },
) => HttpResponseLike | Promise<HttpResponseLike>;

/** A `fetch` replacement that records every URL and delegates to `handler`. */
export function createFetchStub(handler: FetchHandler): FetchStub {
  const requests: RecordedRequest[] = [];

  const fetcher: Fetcher = async (url, init) => {
    requests.push({ url, signal: init.signal });

    return handler(url, init);
  };

  return {
    fetcher,
    requests,
    get paths() {
      return requests.map((request) => new URL(request.url).pathname + new URL(request.url).search);
    },
  };
}

/** The first recorded request, or a failure — keeps tests free of non-null assertions. */
export function firstRequest(stub: FetchStub): RecordedRequest {
  const [request] = stub.requests;

  if (request === undefined) {
    throw new Error('Expected the provider to make at least one request.');
  }

  return request;
}

/** Parsed URL of the request at `index`. */
export function requestUrl(stub: FetchStub, index = 0): URL {
  const [request] = stub.requests.slice(index);

  if (request === undefined) {
    throw new Error(`Expected a request at index ${index}.`);
  }

  return new URL(request.url);
}

/** Convenience: answer by URL predicate, falling back to a 404. */
export function routeFetch(
  routes: readonly { readonly match: (url: URL) => boolean; readonly respond: FetchHandler }[],
): FetchStub {
  return createFetchStub((url, init) => {
    const parsed = new URL(url);
    const route = routes.find((candidate) => candidate.match(parsed));

    return route === undefined ? jsonResponse({}, { status: 404 }) : route.respond(url, init);
  });
}

// ------------------------------------------------------------------ payloads

/** Advanced search: two documents, mixed string/array fields, numeric `year`. */
export const SEARCH_RESPONSE = {
  responseHeader: { status: 0, QTime: 12 },
  response: {
    numFound: 1284,
    start: 0,
    docs: [
      {
        identifier: 'nosferatu',
        title: 'Nosferatu (1922)',
        description: '<p>A silent vampire film.</p>',
        mediatype: 'movies',
        creator: ['Murnau, F. W.', 'Film Preservation Society'],
        date: '1922-03-04',
        year: '1922',
        subject: ['vampire', 'silent film', 'horror'],
        collection: ['feature_films'],
        language: 'eng',
        licenseurl: 'https://creativecommons.org/publicdomain/mark/1.0/',
        downloads: 128,
      },
      {
        identifier: 'gutenberg_alice',
        title: 'Alice’s Adventures in Wonderland',
        mediatype: 'texts',
        creator: 'Carroll, Lewis',
        date: '1865',
        subject: 'fantasy',
        collection: 'gutenberg',
        year: 1865,
      },
    ],
  },
};

/** Metadata for a movie item: one original, three derivatives, two administrative files. */
export const ITEM_RESPONSE = {
  created: 1234,
  d1: 'ia801234.us.archive.org',
  d2: 'ia901234.us.archive.org',
  dir: '/21/items/nosferatu',
  files_count: 6,
  item_last_updated: 1700000000,
  item_size: 536870912,
  server: 'ia801234.us.archive.org',
  uniq: 123456,
  metadata: {
    identifier: 'nosferatu',
    title: 'Nosferatu',
    description:
      '<p>An unauthorized adaptation of <i>Dracula</i>.<br />Restored print.</p><p>Second paragraph &amp; notes.</p>',
    mediatype: 'movies',
    creator: 'Murnau, F. W.',
    date: '1922-03-04T00:00:00Z',
    year: '1922',
    publisher: 'Prana Film',
    language: ['eng', 'ger'],
    subject: ['vampire', 'silent film'],
    collection: ['feature_films'],
    licenseurl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    rights: 'Public domain in the United States.',
    downloads: '1024',
  },
  files: [
    {
      name: 'nosferatu_512kb.mp4',
      source: 'derivative',
      format: '512Kb MPEG4',
      size: '314572800',
      md5: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      mtime: '1700000000',
      length: '5670.5',
      height: '480',
      width: '640',
    },
    {
      name: 'nosferatu.mp4',
      source: 'original',
      format: 'h.264',
      size: '536870912',
      md5: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      sha1: 'cccccccccccccccccccccccccccccccccccccccc',
    },
    {
      name: 'nosferatu_thumb.jpg',
      source: 'derivative',
      format: 'JPEG Thumb',
      size: '10240',
      md5: 'dddddddddddddddddddddddddddddddd',
    },
    {
      name: 'nosferatu_meta.xml',
      source: 'metadata',
      format: 'Metadata',
      size: '2048',
      md5: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    },
    {
      name: '_files.xml',
      source: 'metadata',
      format: 'Metadata',
      size: '4096',
      md5: 'ffffffffffffffffffffffffffffffff',
    },
    {
      name: 'nosferatu.ogv',
      source: 'derivative',
      format: 'Ogg Video',
      size: '400000000',
      md5: '11111111111111111111111111111111',
    },
  ],
};

/** Lending-library scan: metadata is public, files are not downloadable. */
export const LENDING_RESPONSE = {
  files_count: 3,
  metadata: {
    identifier: 'lendingbook',
    title: 'A Lending Library Book',
    mediatype: 'texts',
    creator: 'Author, A.',
    date: '1910',
    collection: ['inlibrary', 'printdisabled', 'americana'],
  },
  files: [
    {
      name: 'lendingbook.pdf',
      source: 'derivative',
      format: 'Text PDF',
      size: '1048576',
      md5: '22222222222222222222222222222222',
    },
    {
      name: 'lendingbook_djvu.txt',
      source: 'derivative',
      format: 'DjVuTXT',
      size: '512',
      md5: '33333333333333333333333333333333',
    },
    {
      name: 'lendingbook.jpg',
      source: 'original',
      format: 'JPEG',
      size: '20480',
      md5: '44444444444444444444444444444444',
    },
  ],
};

/** `nodownload` is set: visible, but no file may be fetched. */
export const NO_DOWNLOAD_RESPONSE = {
  nodownload: true,
  files_count: 1,
  metadata: {
    identifier: 'nodownload_item',
    title: 'View Only',
    mediatype: 'audio',
    collection: ['audio_music'],
  },
  files: [
    {
      name: 'track.mp3',
      source: 'original',
      format: 'VBR MP3',
      size: '4096',
      md5: '55555555555555555555555555555555',
    },
  ],
};

/** Withdrawn item: `is_dark` is true and the metadata is still served. */
export const DARK_RESPONSE = {
  is_dark: true,
  metadata: {
    identifier: 'darkitem',
    title: 'Withdrawn Item',
    mediatype: 'texts',
    collection: ['inlibrary'],
  },
};

/** What the metadata endpoint answers for an identifier it does not know. */
export const UNKNOWN_ITEM_RESPONSE = {};

export const COLLECTION_METADATA_RESPONSE = {
  files_count: 12,
  metadata: {
    identifier: 'feature_films',
    title: 'Feature Films',
    description: 'Feature-length films collected from many sources.',
    mediatype: 'collection',
    subject: ['film', 'cinema'],
  },
  files: [
    { name: '__ia_thumb.jpg', source: 'original', format: 'JPEG', size: '10240' },
    { name: 'feature_films_meta.xml', source: 'metadata', format: 'Metadata', size: '2048' },
  ],
};

/** Identifier lookup for a category's collections: one hit, one miss. */
export const CATEGORY_COLLECTIONS_RESPONSE = {
  response: {
    numFound: 2,
    docs: [
      {
        identifier: 'feature_films',
        title: 'Feature Films',
        description: 'Feature-length films.',
        mediatype: 'collection',
        collection: ['movies'],
      },
      {
        identifier: 'prelinger',
        title: 'Prelinger Archives',
        mediatype: 'collection',
      },
    ],
  },
};

/** `rows=0` count response. */
export const COUNT_RESPONSE = { response: { numFound: 4210, docs: [] } };

export const MALFORMED_SEARCH_RESPONSE = { response: { docs: 'not-an-array' } };

export const EMPTY_RESPONSE = {};
