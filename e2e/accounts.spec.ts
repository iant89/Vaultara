import { expect, test } from '@playwright/test';
import { appUrl } from './appBase';

test('creates an account that survives a refresh and can sign out', async ({ page }) => {
  await page.goto(appUrl('/settings'));

  await expect(page.getByRole('heading', { level: 2, name: 'Overview' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Display name' }).fill('Alex');
  await page.getByRole('textbox', { name: 'Email' }).first().fill('alex@example.com');
  await page.getByLabel('Password').first().fill('correct horse');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(
    page.getByRole('heading', { level: 1, name: 'Choose your categories' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Skip' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Discovery' })).toBeVisible();

  await page.goto(appUrl('/'));
  await expect(page.getByRole('heading', { level: 1, name: 'Discovery' })).toBeVisible();

  await page.getByRole('button', { name: 'Account menu' }).click();
  await expect(page.getByText(/Signed in as/)).toContainText('Alex');

  await page.goto(appUrl('/settings'));
  await expect(page.getByText(/Signed in as/)).toContainText('Alex');

  await page.getByRole('button', { name: 'Account menu' }).click();
  await page
    .getByRole('group', { name: 'Account' })
    .getByRole('button', { name: 'Sign out' })
    .click();

  await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();
});
