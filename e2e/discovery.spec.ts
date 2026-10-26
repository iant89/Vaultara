import { expect, test } from '@playwright/test';
import type { Page, Route } from '@playwright/test';
import { appUrl } from './appBase';
import { buildMinimalPdf } from './minimalPdf';

/**
 * Discovery experience coverage with provider data (roadmap Phase 5).
 *
 * The suite stubs the Archive's two JSON endpoints so the assertions do not depend on network
 * access or on what the live service happens to hold today. Responses are shaped like the real
 * payloads — `advancedsearch.php` returns `{ response: { docs, numFound } }` and `metadata/<id>`
 * returns `{ metadata, files }` — so the mapping layer is exercised end to end in a real browser.
 *
 * The stub also mirrors the provider's hierarchy: `mediatype:collection AND collection:<parent>`
 * returns the collections inside a branch, while an item query carries `-mediatype:collection`,
 * which is what separates a collection's items from the collections nested in it.
 */

const JSON_HEADERS = { 'content-type': 'application/json', 'access-control-allow-origin': '*' };

/** Long enough to break a naive layout, short enough to read. */
const LONG_TITLE =
  'A relentlessly long item title about municipal tramways, waterworks and civic architecture';

/** Collections the stub reports for each branch of the tree. */
const COLLECTIONS_BY_PARENT: Readonly<
  Record<string, readonly { readonly identifier: string; readonly title: string }[]>
> = {
  movies: [
    { identifier: 'feature_films', title: 'Feature Films' },
    { identifier: 'classic_tv', title: 'Classic TV' },
  ],
  feature_films: [{ identifier: 'feature_films_noir', title: 'Film Noir' }],
  software: [{ identifier: 'softwarelibrary', title: 'Software Library' }],
  softwarelibrary: [{ identifier: 'softwarelibrary_msdos_games', title: 'MS-DOS Games' }],
};

/** Titles the metadata endpoint returns for the collections the stub knows about. */
const COLLECTION_TITLES: Readonly<Record<string, string>> = {
  feature_films: 'Feature Films',
  classic_tv: 'Classic TV',
  feature_films_noir: 'Film Noir',
  softwarelibrary: 'Software Library',
  softwarelibrary_msdos_games: 'MS-DOS Games',
  SciFi_Horror: 'Sci-Fi / Horror',
};

/** Every collection rises to its media type, exactly as the Archive flattens ancestry. */
function ancestorsOf(identifier: string): readonly string[] {
  if (identifier.startsWith('software')) {
    return ['softwarelibrary', 'software'];
  }

  return ['feature_films', 'movies'];
}

/**
 * Immediate parent chain for a *collection* document. Nested identifiers list the intermediate
 * parent; top-level ones list only the media type. The adapter uses this to detect direct
 * children instead of a hardcoded tree.
 */
function collectionParents(identifier: string): readonly string[] {
  switch (identifier) {
    case 'feature_films':
    case 'classic_tv':
      return ['movies'];
    case 'feature_films_noir':
    case 'SciFi_Horror':
      return ['feature_films', 'movies'];
    case 'softwarelibrary':
      return ['software'];
    case 'softwarelibrary_msdos_games':
      return ['softwarelibrary', 'software'];
    default:
      return ['movies'];
  }
}

function parentOf(query: string): string {
  return /collection:([^\s)]+)/.exec(query)?.[1] ?? 'unknown';
}

function collectionDocs(query: string): readonly Record<string, unknown>[] {
  const parent = parentOf(query);

  return (COLLECTIONS_BY_PARENT[parent] ?? COLLECTIONS_BY_PARENT['movies'] ?? []).map((entry) => ({
    identifier: entry.identifier,
    title: entry.title,
    mediatype: 'collection',
    description: 'A curated group of items.',
    collection: collectionParents(entry.identifier),
  }));
}

function itemDocs(
  query: string,
  rows: number,
  pageNumber: number,
): readonly Record<string, unknown>[] {
  const parent = parentOf(query);
  const mediatype = /mediatype:\(([^)]+)\)/.exec(query)?.[1]?.split(' OR ')[0] ?? 'movies';
  const wanted = Math.min(rows, 24);

  return Array.from({ length: wanted }, (_, index) => ({
    // Page number in the identifier, so an appended page is visibly new content.
    identifier: `${parent}-p${String(pageNumber)}-${String(index)}`,
    title: pageNumber === 1 && index === 0 ? LONG_TITLE : `${parent} item ${String(index + 1)}`,
    mediatype,
    description: 'A short description of the item.',
    creator: 'Archive contributor',
    date: '1954-01-01',
    collection: [parent, ...ancestorsOf(parent)],
    subject: ['history', 'film'],
    downloads: 1200 + index,
  }));
}

async function mockArchive(page: Page): Promise<void> {
  await page.route('**/advancedsearch.php**', async (route: Route) => {
    const url = new URL(route.request().url());
    const query = url.searchParams.get('q') ?? '';
    const rows = Number(url.searchParams.get('rows') ?? '24');
    const pageNumber = Number(url.searchParams.get('page') ?? '1');

    // `rows=0` is the count-only request behind a collection's item total. An item query carries
    // `-mediatype:collection`, so the negative clause has to be checked before the positive one.
    const asksForCollections =
      query.includes('mediatype:collection') && !query.includes('-mediatype:collection');
    const docs =
      rows === 0
        ? []
        : asksForCollections
          ? collectionDocs(query)
          : itemDocs(query, rows, pageNumber);

    await route.fulfill({
      status: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        response: { docs, numFound: 4210 },
      }),
    });
  });

  await page.route('**/metadata/**', async (route: Route) => {
    const identifier = decodeURIComponent(
      new URL(route.request().url()).pathname.split('/').pop() ?? '',
    );
    const isCollection = COLLECTION_TITLES[identifier] !== undefined;
    const title =
      identifier === 'night_of_the_living_dead'
        ? 'Night of the Living Dead'
        : (COLLECTION_TITLES[identifier] ?? identifier);

    await route.fulfill({
      status: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        files_count: 2,
        item_size: 73_400_320,
        metadata: {
          identifier,
          title,
          mediatype: isCollection ? 'collection' : 'movies',
          creator: 'George A. Romero',
          date: '1968-10-01',
          description:
            '<p>A night in rural Pennsylvania turns into a siege.</p><p>Restored from a public-domain print.</p>',
          collection: ancestorsOf(identifier),
          subject: ['horror', 'public domain'],
          licenseurl: 'https://creativecommons.org/publicdomain/mark/1.0/',
          rights: 'Public domain.',
        },
        files: [
          {
            name: 'night_of_the_living_dead.mp4',
            source: 'original',
            format: 'h.264 IA',
            size: '73400320',
            md5: 'd41d8cd98f00b204e9800998ecf8427e',
          },
          { name: 'notes.pdf', source: 'derivative', format: 'Text PDF', size: '204800' },
        ],
      }),
    });
  });
}

/** Horizontal overflow of the document, in pixels. */
async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const root = document.documentElement;

    return Math.max(root.scrollWidth, document.body.scrollWidth) - window.innerWidth;
  });
}

test('the discovery page renders provider rows and a featured item', async ({ page }) => {
  await mockArchive(page);
  await page.goto(appUrl('/'));

  await expect(page.getByRole('heading', { level: 1, name: 'Discovery' })).toBeVisible();
  await expect(page.getByText('Featured')).toBeVisible();

  const films = page.getByRole('heading', { level: 2, name: 'Films' });

  await expect(films).toBeVisible();
  // Cards arrive from the stub, so the row is no longer a skeleton.
  await expect(page.getByRole('heading', { level: 3, name: LONG_TITLE }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /View all/ }).first()).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Browse by category' })).toBeVisible();

  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
});

test('a category page lists collections and pages through them', async ({ page }) => {
  await mockArchive(page);
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(appUrl('/category/movies'));

  await expect(page.getByRole('heading', { level: 1, name: 'Moving Images' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Feature Films' })).toBeVisible();
  // Collections list their provider; an item count needs a separate count request and is only
  // claimed where the provider reports one.
  await expect(page.getByText('Internet Archive').first()).toBeVisible();

  // The provider reported a total, so the pages are numbered rather than a bare "Next".
  const pager = page.getByRole('navigation', { name: 'Collection pages' });

  await expect(pager.getByRole('link', { name: '2', exact: true })).toHaveAttribute(
    'href',
    appUrl('/category/movies?page=2'),
  );

  await pager.getByRole('link', { name: /Next/ }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByText('Page 2 of 702')).toBeVisible();

  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
});

test('a collection page lists items, sorts, searches, and adds more on request', async ({
  page,
}) => {
  await mockArchive(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(appUrl('/collection/archive/feature_films'));

  await expect(page.getByRole('heading', { level: 1, name: 'Feature Films' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Items' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: LONG_TITLE }).first()).toBeVisible();

  // A long title must wrap, not widen the page (roadmap 5.5: responsive scrolling).
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);

  await page.getByLabel('Sort by').selectOption('title-asc');
  await expect(page).toHaveURL(/sort=title-asc/);

  await page.getByLabel('Search this collection').fill('tram');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/q=tram/);

  const cards = page.locator('ul[aria-label="Collection items"] > li');

  await expect(cards).toHaveCount(24);
  await expect(page.getByText('Showing 24 of 4,210 items')).toBeVisible();

  await page.getByRole('button', { name: 'View more items' }).click();

  // Appended rather than replaced: the first page stays and a second batch joins it.
  await expect(cards).toHaveCount(48);
  await expect(page.getByText('Showing 48 of 4,210 items')).toBeVisible();
});

test('the collection hierarchy descends from a media type into nested collections', async ({
  page,
}) => {
  await mockArchive(page);
  await page.goto(appUrl('/category/software'));

  await expect(page.getByRole('heading', { level: 1, name: 'Software' })).toBeVisible();

  await page.getByRole('link', { name: 'Software Library' }).click();
  await expect(page).toHaveURL(/\/collection\/archive\/softwarelibrary/);
  await expect(page.getByRole('heading', { level: 2, name: 'Collections inside' })).toBeVisible();

  await page.getByRole('link', { name: 'MS-DOS Games' }).click();
  await expect(page).toHaveURL(/\/collection\/archive\/softwarelibrary_msdos_games/);
  await expect(page.getByRole('heading', { level: 1, name: 'MS-DOS Games' })).toBeVisible();
});

test('a collection opened as an item is sent to the collection page', async ({ page }) => {
  await mockArchive(page);
  await page.goto(appUrl('/item/archive/SciFi_Horror'));

  await expect(page).toHaveURL(/\/collection\/archive\/SciFi_Horror/);
  await expect(page.getByRole('heading', { level: 1, name: 'Sci-Fi / Horror' })).toBeVisible();
});

test('an item page shows files, attribution, and related content', async ({ page }) => {
  await mockArchive(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(appUrl('/item/archive/night_of_the_living_dead'));

  await expect(
    page.getByRole('heading', { level: 1, name: 'Night of the Living Dead' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Files' })).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Download night_of_the_living_dead/ }),
  ).toHaveAttribute(
    'href',
    'https://archive.org/download/night_of_the_living_dead/night_of_the_living_dead.mp4',
  );
  await expect(page.getByRole('link', { name: /Read notes.pdf/ })).toHaveAttribute(
    'href',
    /\/viewer\/archive\/night_of_the_living_dead\?file=notes\.pdf$/,
  );
  await expect(
    page.getByRole('link', { name: 'View this item on Internet Archive' }),
  ).toHaveAttribute('href', 'https://archive.org/details/night_of_the_living_dead');
  await expect(page.getByRole('heading', { level: 2, name: 'Related items' })).toBeVisible();
  await expect(page.getByText('Public domain.', { exact: true })).toBeVisible();

  // Related content is a batch, not a cap: the reader can ask for the rest.
  await expect(page.getByRole('button', { name: 'View more related items' })).toBeVisible();

  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
});

test('a PDF file opens in the in-app reader', async ({ page }) => {
  await mockArchive(page);
  await page.route('**/download/**/*.pdf', async (route: Route) => {
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

    await route.fulfill({
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'access-control-allow-origin': '*',
        'access-control-expose-headers': 'Accept-Ranges,Content-Length',
      },
      body: Buffer.from(buildMinimalPdf(['Page one', 'Page two', 'Page three', 'Page four'])),
    });
  });

  await page.goto(appUrl('/item/archive/night_of_the_living_dead'));
  await page.getByRole('link', { name: /Read notes.pdf/ }).click();

  await expect(page.getByRole('toolbar', { name: 'PDF reader' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Book' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: '2 by 2 grid' }).click();
  await page.getByRole('button', { name: 'Page 3, open full screen' }).click();
  await expect(page.getByRole('dialog', { name: 'Full screen page' })).toBeVisible();
});
