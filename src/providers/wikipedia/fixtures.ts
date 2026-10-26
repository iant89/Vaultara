/**
 * Wikipedia payload fixtures and transport stubs for tests.
 *
 * These follow documented Action API `formatversion=2` shapes. Tests never call wikipedia.org.
 */

import type { Fetcher, HttpResponseLike } from './api';

export interface StubResponseInit {
  readonly status?: number;
  readonly headers?: Readonly<Record<string, string>>;
}

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
}

export type FetchHandler = (
  url: string,
  init: { readonly signal?: AbortSignal },
) => HttpResponseLike | Promise<HttpResponseLike>;

export function createFetchStub(handler: FetchHandler): FetchStub {
  const requests: RecordedRequest[] = [];

  const fetcher: Fetcher = async (url, init) => {
    requests.push({ url, signal: init.signal });

    return handler(url, init);
  };

  return { fetcher, requests };
}

export function requestUrl(stub: FetchStub, index = 0): URL {
  const request = stub.requests[index];

  if (request === undefined) {
    throw new Error(`Expected a request at index ${index}.`);
  }

  return new URL(request.url);
}

export const ADA_PAGE = {
  pageid: 123,
  title: 'Ada Lovelace',
  extract: 'Augusta Ada King, Countess of Lovelace, was an English mathematician.',
  description: 'English mathematician',
  fullurl: 'https://en.wikipedia.org/wiki/Ada_Lovelace',
  thumbnail: {
    source: 'https://upload.wikimedia.org/wikipedia/commons/a/a4/Ada.jpg',
    width: 200,
    height: 280,
  },
  categories: [{ title: 'Category:English mathematicians' }, { title: 'Category:1815 births' }],
  langlinks: [
    { lang: 'it', title: 'Ada Lovelace', url: 'https://it.wikipedia.org/wiki/Ada_Lovelace' },
  ],
};

export const SEARCH_PAGES = {
  query: {
    pages: [ADA_PAGE],
    searchinfo: { totalhits: 1 },
  },
};

export const MOST_VIEWED = {
  query: {
    mostviewed: [
      { ns: 0, title: 'Ada Lovelace', count: 9000 },
      { ns: 0, title: 'Charles Babbage', count: 8000 },
      { ns: 14, title: 'Category:Science', count: 10 },
    ],
  },
};

export const MISSING_PAGE = {
  query: {
    pages: [{ missing: true, title: 'Not A Real Article' }],
  },
};

export const PARSE_RESPONSE = {
  parse: {
    title: 'Ada Lovelace',
    displaytitle: 'Ada Lovelace',
    text: `<div class="mw-parser-output">
<p>Ada Lovelace was a mathematician.</p>
<h2 id="Biography">Biography</h2>
<p>See <a href="/wiki/Charles_Babbage">Charles Babbage</a> and
<a href="javascript:alert(1)">evil</a>.</p>
<p><img src="//upload.wikimedia.org/wikipedia/commons/a/a4/Ada.jpg" alt="Ada"></p>
<p><img src="https://evil.example/track.png" alt="tracker"></p>
<script>document.title="pwned"</script>
<h2 id="References">References</h2>
<ol class="references"><li id="cite_note-1">A book.</li></ol>
</div>`,
    sections: [
      { toclevel: 1, line: 'Biography', anchor: 'Biography' },
      { toclevel: 1, line: 'References', anchor: 'References' },
    ],
  },
};

export const CATEGORY_MEMBERS = {
  query: {
    categorymembers: [
      { pageid: 1, ns: 14, title: 'Category:Physics' },
      { pageid: 2, ns: 14, title: 'Category:Biology' },
    ],
  },
  continue: { cmcontinue: 'page|BIOLOGY|2' },
};

export const CATEGORY_INFO = {
  query: {
    pages: [
      {
        pageid: 9,
        title: 'Category:Science',
        fullurl: 'https://en.wikipedia.org/wiki/Category:Science',
        extract: 'Science is a systematic discipline.',
        categoryinfo: { size: 400, pages: 12, files: 0, subcats: 80 },
      },
    ],
  },
};

export const MEDIAWIKI_ERROR = {
  error: { code: 'missingtitle', info: "The page you specified doesn't exist." },
};
