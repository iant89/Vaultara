import { expect, test } from '@playwright/test';
import type { Page, Route } from '@playwright/test';
import { appUrl } from './appBase';

/**
 * Discovery experience coverage with provider data (roadmap Phase 5).
 *
 * The suite stubs the Archive's two JSON endpoints so the assertions do not depend on network
 * access or on what the live service happens to hold today. Responses are shaped like the real
 * payloads — `advancedsearch.php` returns `{ response: { docs, numFound } }` and `metadata/<id>`
 * returns `{ metadata, files }` — so the mapping layer is exercised end to end in a real browser.
 */

const JSON_HEADERS = { 'content-type': 'application/json', 'access-control-allow-origin': '*' };

/** Long enough to break a naive layout, short enough to read. */
const LONG_TITLE =
  'A relentlessly long item title about municipal tramways, waterworks and civic architecture';

function searchDocs(query: string, count: number): readonly Record<string, unknown>[] {
  const mediatype = /mediatype:\(([^)]+)\)/.exec(query)?.[1]?.split(' OR ')[0] ?? 'movies';
  const collection = /collection:([^\s)]+)/.exec(query)?.[1];

  if (query.startsWith('identifier:')) {
    const wanted = /identifier:\((.+)\)/.exec(query)?.[1]?.split(' OR ') ?? [];

    return wanted.map((identifier) => ({
      identifier,
      title: identifier.replace(/[_-]/g, ' '),
      mediatype: 'collection',
      description: 'A curated group of items.',
      collection: ['movies'],
    }));
  }

  return Array.from({ length: count }, (_, index) => ({
    identifier: `${collection ?? mediatype}-${index}`,
    title: index === 0 ? LONG_TITLE : `${collection ?? mediatype} item ${index + 1}`,
    mediatype,
    description: 'A short description of the item.',
    creator: 'Archive contributor',
    date: '1954-01-01',
    collection: collection === undefined ? ['feature_films'] : [collection],
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
    const docs = rows === 0 ? [] : searchDocs(query, Math.min(rows, 24));

    await route.fulfill({
      status: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        response: { docs, numFound: pageNumber === 1 ? 4210 : 4186 },
      }),
    });
  });

  await page.route('**/metadata/**', async (route: Route) => {
    const identifier = decodeURIComponent(
      new URL(route.request().url()).pathname.split('/').pop() ?? '',
    );
    const title =
      identifier === 'night_of_the_living_dead' ? 'Night of the Living Dead' : identifier;

    await route.fulfill({
      status: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        files_count: 2,
        item_size: 73_400_320,
        metadata: {
          identifier,
          title,
          mediatype: 'movies',
          creator: 'George A. Romero',
          date: '1968-10-01',
          description:
            '<p>A night in rural Pennsylvania turns into a siege.</p><p>Restored from a public-domain print.</p>',
          collection: ['feature_films'],
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

test('a collection page lists items, sorts, and pages', async ({ page }) => {
  await mockArchive(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(appUrl('/collection/archive/feature_films'));

  await expect(page.getByRole('heading', { level: 1, name: 'feature_films' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Items' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: LONG_TITLE }).first()).toBeVisible();

  // A long title must wrap, not widen the page (roadmap 5.5: responsive scrolling).
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);

  await page.getByLabel('Sort by').selectOption('title-asc');
  await expect(page).toHaveURL(/sort=title-asc/);

  await page.getByLabel('Search this collection').fill('tram');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/q=tram/);

  await page.getByRole('link', { name: /Next/ }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByText('Page 2')).toBeVisible();
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
  await expect(
    page.getByRole('link', { name: 'View this item on Internet Archive' }),
  ).toHaveAttribute('href', 'https://archive.org/details/night_of_the_living_dead');
  await expect(page.getByRole('heading', { level: 2, name: 'Related items' })).toBeVisible();
  await expect(page.getByText('Public domain.', { exact: true })).toBeVisible();

  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
});

test('a category page lists its collections with provider attribution', async ({ page }) => {
  await mockArchive(page);
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(appUrl('/category/movies'));

  await expect(page.getByRole('heading', { level: 1, name: 'Moving Images' })).toBeVisible();
  await expect(page.getByRole('link', { name: /feature films/ })).toBeVisible();
  // Collections list their provider; an item count needs a separate count request and is only
  // claimed where the provider reports one.
  await expect(page.getByText('Internet Archive').first()).toBeVisible();

  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
});
