import type { Page, Route } from '@playwright/test';

const JSON_HEADERS = { 'content-type': 'application/json', 'access-control-allow-origin': '*' };

const ADA_PAGE = {
  pageid: 123,
  title: 'Ada Lovelace',
  extract: 'Augusta Ada King, Countess of Lovelace, was an English mathematician.',
  description: 'English mathematician',
  fullurl: 'https://en.wikipedia.org/wiki/Ada_Lovelace',
  thumbnail: {
    source: 'https://upload.wikimedia.org/wikipedia/commons/a/a4/Ada_Lovelace.jpg',
    width: 200,
    height: 280,
  },
  categories: [{ title: 'Category:English mathematicians' }],
  langlinks: [
    { lang: 'it', title: 'Ada Lovelace', url: 'https://it.wikipedia.org/wiki/Ada_Lovelace' },
  ],
};

const PARSE_HTML = `<div class="mw-parser-output">
<p>Ada Lovelace was a mathematician.</p>
<h2 id="Biography">Biography</h2>
<p>See <a href="/wiki/Charles_Babbage">Charles Babbage</a>.</p>
<script>document.title="pwned"</script>
<h2 id="References">References</h2>
<ol class="references"><li id="cite_note-1">A book.</li></ol>
</div>`;

// A glob such as **/wikipedia.org/w/api.php never matches en.wikipedia.org: it requires a slash
// immediately before wikipedia.org. The Action API lives on the language subdomain.
const WIKIPEDIA_API = /https:\/\/[a-z]+\.wikipedia\.org\/w\/api\.php(?:\?|$)/;

export async function mockWikipedia(page: Page): Promise<void> {
  await page.route(WIKIPEDIA_API, async (route: Route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,HEAD,OPTIONS',
          'access-control-allow-headers': '*',
        },
      });
      return;
    }

    const url = new URL(route.request().url());
    const action = url.searchParams.get('action');
    const list = url.searchParams.get('list');

    if (list === 'mostviewed') {
      await route.fulfill({
        status: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify({
          query: { mostviewed: [{ ns: 0, title: 'Ada Lovelace', count: 9000 }] },
        }),
      });
      return;
    }

    if (list === 'categorymembers') {
      await route.fulfill({
        status: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify({
          query: {
            categorymembers: [{ pageid: 1, ns: 14, title: 'Category:Physics' }],
          },
        }),
      });
      return;
    }

    if (action === 'parse') {
      await route.fulfill({
        status: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify({
          parse: {
            title: 'Ada Lovelace',
            displaytitle: 'Ada Lovelace',
            text: PARSE_HTML,
            sections: [
              { toclevel: 1, line: 'Biography', anchor: 'Biography' },
              { toclevel: 1, line: 'References', anchor: 'References' },
            ],
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        query: {
          pages: [ADA_PAGE],
          searchinfo: { totalhits: 1 },
        },
      }),
    });
  });
}
