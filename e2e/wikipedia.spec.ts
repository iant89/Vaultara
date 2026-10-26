import { expect, test } from '@playwright/test';
import { appUrl } from './appBase';
import { mockWikipedia } from './wikipedia';

test('Wikipedia browsing opens a sanitised article reader', async ({ page }) => {
  await mockWikipedia(page);
  await page.goto(appUrl('/provider/wikipedia'));

  await expect(page.getByRole('heading', { level: 1, name: 'Wikipedia' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Popular now' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ada Lovelace' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Science/ })).toHaveAttribute(
    'href',
    /\/collection\/wikipedia\/Science/,
  );

  await page.getByRole('link', { name: 'Ada Lovelace' }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Ada Lovelace' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Read Ada Lovelace' })).toBeVisible();
  await expect(page.getByRole('link', { name: /View this item on Wikipedia/ })).toBeVisible();

  await page.getByRole('link', { name: 'Read Ada Lovelace' }).click();
  await expect(page.getByRole('toolbar', { name: 'Wikipedia reader' })).toBeVisible();
  await expect(page.getByText('Ada Lovelace was a mathematician.')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Table of contents' })).toBeVisible();
  await expect(page.getByText('A book.')).toBeVisible();
  // The injected <script> in the parse HTML must not run (design spec 12.2).
  expect(await page.title()).not.toBe('pwned');
});
