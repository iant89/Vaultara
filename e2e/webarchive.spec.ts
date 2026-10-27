import { expect, test } from '@playwright/test';
import type { Page, Route } from '@playwright/test';
import { appUrl } from './appBase';

const JSON_HEADERS = { 'content-type': 'application/json', 'access-control-allow-origin': '*' };

async function mockWebItem(
  page: Page,
  metadata: Record<string, unknown> = { originalurl: 'http://example.com/' },
): Promise<void> {
  await page.route('**/advancedsearch.php**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({ response: { docs: [], numFound: 0 } }),
    });
  });

  await page.route('**/metadata/web_capture_stub', async (route: Route) => {
    await route.fulfill({
      status: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        files_count: 1,
        item_size: 2048,
        metadata: {
          identifier: 'web_capture_stub',
          title: 'Example capture',
          mediatype: 'web',
          date: '2005-03-15',
          licenseurl: 'https://creativecommons.org/publicdomain/zero/1.0/',
          ...metadata,
        },
        files: [
          {
            name: 'example.com-20050315120000.warc.gz',
            source: 'original',
            format: 'Web ARChive GZ',
            size: '2048',
          },
        ],
      }),
    });
  });
}

test('a web capture opens in a sandboxed Wayback frame', async ({ page }) => {
  await mockWebItem(page);
  await page.route('https://web.archive.org/**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
      body: `<!doctype html><script>
try { parent.document.title = 'pwned'; } catch (error) {}
try { localStorage.setItem('vaultara-pwn', '1'); } catch (error) {}
</script><p>archived page</p>`,
    });
  });

  await page.goto(appUrl('/item/archive/web_capture_stub'));
  await page.getByRole('link', { name: 'View example.com-20050315120000.warc.gz' }).click();

  const frame = page.getByTitle('Archived capture of Example capture');
  await expect(frame).toBeVisible();
  await expect(frame).toHaveAttribute('sandbox', 'allow-scripts allow-forms');
  expect(await frame.getAttribute('sandbox')).not.toMatch(/same-origin/);
  expect(await frame.getAttribute('sandbox')).not.toMatch(/top-navigation/);
  await expect(page.getByText(/Captured 2005-03-15/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Original URL' })).toHaveAttribute(
    'href',
    'http://example.com/',
  );
  await expect(page.getByText(/cannot read this app/i)).toBeVisible();
  expect(await page.title()).not.toBe('pwned');
  expect(await page.evaluate(() => localStorage.getItem('vaultara-pwn'))).toBeNull();
});

test('a capture without an original URL is refused without a frame', async ({ page }) => {
  await mockWebItem(page, { originalurl: '' });

  await page.goto(
    appUrl('/viewer/archive/web_capture_stub?file=example.com-20050315120000.warc.gz'),
  );
  await expect(page.getByText(/no original URL/i)).toBeVisible();
  await expect(page.getByTitle('Archived capture of Example capture')).toHaveCount(0);
});
