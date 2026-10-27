import { expect, test } from '@playwright/test';
import type { Page, Route } from '@playwright/test';
import { appUrl } from './appBase';

const JSON_HEADERS = { 'content-type': 'application/json', 'access-control-allow-origin': '*' };

async function mockSoftwareItem(page: Page): Promise<void> {
  await page.route('**/advancedsearch.php**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({ response: { docs: [], numFound: 0 } }),
    });
  });

  await page.route('**/metadata/dos_software_stub', async (route: Route) => {
    await route.fulfill({
      status: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        files_count: 1,
        item_size: 4096,
        metadata: {
          identifier: 'dos_software_stub',
          title: 'MS-DOS stub',
          mediatype: 'software',
          emulator: 'DOSBox',
          processor: 'x86',
          os: 'MS-DOS',
          licenseurl: 'https://creativecommons.org/publicdomain/zero/1.0/',
        },
        files: [
          {
            name: 'dos.iso',
            source: 'original',
            format: 'ISO Image',
            size: '4096',
          },
        ],
      }),
    });
  });
}

test('a disk image opens for inspection and is not executed', async ({ page }) => {
  await mockSoftwareItem(page);

  await page.goto(appUrl('/item/archive/dos_software_stub'));
  await page.getByRole('link', { name: 'Inspect dos.iso' }).click();

  await expect(page.getByText(/does not run downloaded programs/i)).toBeVisible();
  await expect(page.getByText('MS-DOS', { exact: true })).toBeVisible();
  await expect(page.getByText('DOSBox', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Download dos.iso' }).first()).toHaveAttribute(
    'href',
    'https://archive.org/download/dos_software_stub/dos.iso',
  );
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(page.locator('canvas')).toHaveCount(0);
});
