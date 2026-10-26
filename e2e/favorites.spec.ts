import { expect, test } from '@playwright/test';
import { appUrl } from './appBase';

test('unsigned favorites page asks the reader to sign in', async ({ page }) => {
  await page.goto(appUrl('/favorites'));

  await expect(page.getByRole('heading', { level: 1, name: 'Favorites' })).toBeVisible();
  await expect(page.getByText('Sign in to save favorites')).toBeVisible();
});

test('a new account has an empty favorites list', async ({ page }) => {
  await page.goto(appUrl('/settings'));
  await page.getByRole('textbox', { name: 'Display name' }).fill('Alex');
  await page.getByRole('textbox', { name: 'Email' }).first().fill('alex@example.com');
  await page.getByLabel('Password').first().fill('correct horse');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Choose your categories' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Skip' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Discovery' })).toBeVisible();

  await page.goto(appUrl('/favorites'));
  await expect(page.getByRole('heading', { level: 1, name: 'Favorites' })).toBeVisible();
  await expect(page.getByText('Nothing saved yet')).toBeVisible();
});
