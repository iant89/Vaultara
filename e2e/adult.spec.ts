import { expect, test } from '@playwright/test';
import { appUrl } from './appBase';

test('Adult stays out of navigation and ordinary discovery while disabled', async ({ page }) => {
  await page.goto(appUrl('/'));

  const providers = page.getByRole('navigation', { name: 'Providers' });
  await expect(providers.getByRole('link', { name: 'Internet Archive' })).toBeVisible();
  await expect(providers.getByRole('link', { name: 'Wikipedia' })).toBeVisible();
  await expect(providers.getByRole('link', { name: /^Adult$/ })).toHaveCount(0);

  await page.goto(appUrl('/provider/adult'));
  await expect(page.getByText('The Adult provider is disabled')).toBeVisible();
  await expect(page.getByText(/never appears in ordinary discovery/)).toBeVisible();
});
