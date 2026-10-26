import { expect, test } from '@playwright/test';
import { appUrl, appUrlPattern } from './appBase';

/**
 * End-to-end smoke coverage for the application shell and the discovery surfaces.
 *
 * Assertions stay independent of provider data: the suite must pass with and without a reachable
 * provider, so it checks structure and status copy rather than rows of items.
 */
test('discovery renders its rows and declares what is still missing', async ({ page }) => {
  await page.goto(appUrl('/'));

  await expect(page.getByRole('heading', { level: 1, name: 'Discovery' })).toBeVisible();
  await expect(page.getByRole('main')).toBeVisible();

  // Row headings come from configuration, so they exist before (and without) any provider data.
  await expect(page.getByRole('heading', { level: 2, name: 'Films' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Books and documents' })).toBeVisible();

  // Personalisation is the one recommendation feature that does not exist yet, and the page says
  // so rather than presenting an empty "recommended" shelf (roadmap 5.1).
  await expect(page.getByText('Personal recommendations is not available yet')).toBeVisible();
  await expect(page.getByText('Not implemented')).toBeVisible();
});

test('a category page names the category and offers its collections section', async ({ page }) => {
  await page.goto(appUrl('/category/movies'));

  // Categories are provider configuration, so the title does not depend on a network request.
  await expect(page.getByRole('heading', { level: 1, name: 'Moving Images' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Collections' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();
});

test('an item page offers a trail back to its provider', async ({ page }) => {
  await page.goto(appUrl('/item/archive/night_of_the_living_dead'));

  const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' });
  await expect(crumbs).toBeVisible();

  await crumbs.getByRole('link', { name: 'Internet Archive' }).click();

  await expect(page).toHaveURL(appUrlPattern('/provider/archive'));
  await expect(page.getByRole('heading', { level: 1, name: 'Internet Archive' })).toBeVisible();
});

test('navigates through the primary navigation', async ({ page }) => {
  await page.goto(appUrl('/'));

  // Favourites is a top-level control at every width (design spec 4.3).
  await page.getByRole('link', { name: 'Favorites' }).click();

  await expect(page).toHaveURL(appUrlPattern('/favorites'));
  await expect(page.getByRole('heading', { level: 1, name: 'Favorites' })).toBeVisible();
});

test('reaches secondary destinations through the account menu', async ({ page }) => {
  await page.goto(appUrl('/'));

  await page.getByRole('button', { name: 'Account menu' }).click();

  const library = page.getByRole('group', { name: 'Your library' });
  await library.getByRole('link', { name: 'Downloads' }).click();

  await expect(page).toHaveURL(appUrlPattern('/downloads'));
  await expect(page.getByRole('heading', { level: 1, name: 'Downloads' })).toBeVisible();
});

test('deep links resolve directly and unknown routes are handled', async ({ page }) => {
  await page.goto(appUrl('/settings/privacy'));

  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Privacy' })).toBeVisible();

  await page.goto(appUrl('/no-such-page'));
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
});

test('search submits to the documented search route', async ({ page }) => {
  await page.goto(appUrl('/'));

  await page.getByRole('searchbox', { name: 'Search all providers' }).fill('silent film');
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(appUrlPattern('/search?q=silent%20film'));
  await expect(page.getByRole('heading', { level: 1, name: 'Search' })).toBeVisible();
});

test('the development design system reference renders every component', async ({ page }) => {
  await page.goto(appUrl('/design-system'));

  await expect(page.getByRole('heading', { level: 1, name: 'Design system' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Colour' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Content row' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Sample items' })).toBeVisible();
});
