import { expect, test } from '@playwright/test';
import { appUrl } from './appBase';

test('unsigned downloads page asks the reader to sign in', async ({ page }) => {
  await page.goto(appUrl('/downloads'));

  await expect(page.getByRole('heading', { level: 1, name: 'Downloads' })).toBeVisible();
  await expect(page.getByText('Sign in to keep download history')).toBeVisible();
});

test('a new account has an empty download log', async ({ page }) => {
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

  await page.goto(appUrl('/downloads'));
  await expect(page.getByRole('heading', { level: 1, name: 'Downloads' })).toBeVisible();
  await expect(page.getByText('Nothing opened yet')).toBeVisible();
});
