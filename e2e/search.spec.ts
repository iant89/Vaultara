import { expect, test } from '@playwright/test';
import type { Page, Route } from '@playwright/test';
import { appUrl, appUrlPattern } from './appBase';
import { mockWikipedia } from './wikipedia';

const JSON_HEADERS = { 'content-type': 'application/json', 'access-control-allow-origin': '*' };

async function mockArchiveSearch(page: Page): Promise<void> {
  await page.route('**/advancedsearch.php**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        response: {
          numFound: 1,
          docs: [
            {
              identifier: 'night_of_the_living_dead',
              title: 'Night of the Living Dead',
              mediatype: 'movies',
              creator: 'George A. Romero',
              date: '1968-10-01',
            },
          ],
        },
      }),
    });
  });
}

test('an empty search page asks for a query', async ({ page }) => {
  await page.goto(appUrl('/search'));

  await expect(page.getByRole('heading', { level: 1, name: 'Search' })).toBeVisible();
  await expect(page.getByText('Search every enabled provider')).toBeVisible();
});

test('submitting the header search lists provider results', async ({ page }) => {
  await mockArchiveSearch(page);
  await mockWikipedia(page);
  await page.goto(appUrl('/'));

  await page.getByRole('searchbox', { name: 'Search all providers' }).fill('vampire');
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(appUrlPattern('/search?q=vampire'));
  await expect(page.getByRole('heading', { level: 2, name: 'Internet Archive' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Night of the Living Dead' })).toBeVisible();
});
