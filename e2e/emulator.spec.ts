import { expect, test } from '@playwright/test';
import type { Page, Route } from '@playwright/test';
import { appUrl } from './appBase';
import { buildMinimalGbRom } from './minimalGb';

const JSON_HEADERS = { 'content-type': 'application/json', 'access-control-allow-origin': '*' };
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,HEAD,OPTIONS',
  'access-control-allow-headers': '*',
};

async function mockGameBoyItem(page: Page): Promise<void> {
  await page.route('**/advancedsearch.php**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({ response: { docs: [], numFound: 0 } }),
    });
  });

  await page.route('**/metadata/gb_homebrew_stub', async (route: Route) => {
    await route.fulfill({
      status: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        files_count: 1,
        item_size: 32768,
        metadata: {
          identifier: 'gb_homebrew_stub',
          title: 'Vaultara GB stub',
          mediatype: 'software',
          creator: 'Vaultara tests',
          licenseurl: 'https://creativecommons.org/publicdomain/zero/1.0/',
        },
        files: [
          {
            name: 'homebrew.gb',
            source: 'original',
            format: 'Nintendo GameBoy ROM',
            size: '32768',
          },
        ],
      }),
    });
  });
}

test('a Game Boy ROM opens in the in-app emulator', async ({ page }) => {
  await mockGameBoyItem(page);
  await page.route('**/download/gb_homebrew_stub/homebrew.gb', async (route: Route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS });
      return;
    }

    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/x-gameboy-rom', ...CORS },
      body: buildMinimalGbRom(),
    });
  });

  await page.goto(appUrl('/item/archive/gb_homebrew_stub'));
  await page.getByRole('link', { name: 'Play homebrew.gb' }).click();

  await expect(page.getByRole('toolbar', { name: 'Game Boy emulator' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fullscreen' })).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Up', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'A', exact: true })).toBeVisible();
  await expect(page.getByText(/never run as JavaScript/i)).toBeVisible();

  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
});

test('an invalid ROM is refused without starting play', async ({ page }) => {
  await mockGameBoyItem(page);
  await page.route('**/download/gb_homebrew_stub/homebrew.gb', async (route: Route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS });
      return;
    }

    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/html', ...CORS },
      body: `<!doctype html><p>not a rom</p>${'x'.repeat(400)}`,
    });
  });

  await page.goto(appUrl('/viewer/archive/gb_homebrew_stub?file=homebrew.gb'));
  await expect(page.getByText('This ROM could not be opened')).toBeVisible();
  await expect(page.getByText(/not a Game Boy ROM/i)).toBeVisible();
});

test('an oversized ROM is refused before the body is treated as a cart', async ({ page }) => {
  await mockGameBoyItem(page);
  await page.route('**/download/gb_homebrew_stub/homebrew.gb', async (route: Route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS });
      return;
    }

    await route.fulfill({
      status: 200,
      headers: {
        'content-type': 'application/octet-stream',
        'content-length': String(9 * 1024 * 1024),
        ...CORS,
      },
      body: 'too-big',
    });
  });

  await page.goto(appUrl('/viewer/archive/gb_homebrew_stub?file=homebrew.gb'));
  await expect(page.getByText(/larger than 8 MB/i)).toBeVisible();
});
