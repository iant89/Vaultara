import { expect, test } from '@playwright/test';
import { appUrl, appUrlPattern } from './appBase';

/**
 * End-to-end smoke coverage for the application shell.
 *
 * These tests assert routing and layout only. They deliberately make no claim about provider,
 * discovery, or viewer behaviour, none of which exists yet.
 */
test('discovery shell loads and declares its implementation status', async ({ page }) => {
  await page.goto(appUrl('/'));

  await expect(page.getByRole('heading', { level: 1, name: 'Discovery' })).toBeVisible();
  await expect(page.getByText('Not implemented')).toBeVisible();
  await expect(page.getByRole('main')).toBeVisible();
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
