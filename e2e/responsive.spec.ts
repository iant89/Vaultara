import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { appUrl, appUrlPattern } from './appBase';

/**
 * Responsive, touch-target, and keyboard coverage (roadmap 2.4; design spec 24, 27).
 *
 * These assertions are only meaningful in a real engine, which is why they live in the E2E
 * suite rather than in jsdom.
 */

const VIEWPORTS = [
  { name: 'small mobile', width: 360, height: 640 },
  { name: 'large mobile', width: 414, height: 896 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

const ROUTES = ['/', '/favorites', '/settings', '/search', '/design-system'] as const;

/** Width of the document's scrollable area minus the viewport, in pixels. */
async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const root = document.documentElement;
    return Math.max(root.scrollWidth, document.body.scrollWidth) - window.innerWidth;
  });
}

for (const viewport of VIEWPORTS) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test('does not overflow horizontally', async ({ page }) => {
      for (const route of ROUTES) {
        await page.goto(appUrl(route));

        // A 1px tolerance absorbs sub-pixel rounding at fractional zoom levels.
        expect(
          await horizontalOverflow(page),
          `${route} overflows at ${viewport.width}px`,
        ).toBeLessThanOrEqual(1);
      }
    });

    test('keeps navigation and favourites reachable', async ({ page }) => {
      await page.goto(appUrl('/'));

      await expect(page.getByRole('link', { name: 'Vaultara' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Favorites' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();
      await expect(page.getByRole('link', { name: /Internet Archive/ })).toBeVisible();
    });

    // Regression guard: the provider strip must never clip a tab behind hidden overflow. An
    // earlier layout gave the strip `overflow-x: auto` with the scrollbar hidden, which silently
    // cut off the last provider at several widths. Tabs now wrap instead.
    test('never clips a provider tab', async ({ page }) => {
      await page.goto(appUrl('/'));

      const nav = page.getByRole('navigation', { name: 'Providers' });
      const navBox = await nav.boundingBox();
      expect(navBox, 'provider strip should have a layout box').not.toBeNull();

      const tabs = nav.getByRole('link');
      const count = await tabs.count();
      expect(count).toBeGreaterThan(1);

      for (let index = 0; index < count; index += 1) {
        const tab = tabs.nth(index);
        await expect(tab).toBeVisible();

        const box = await tab.boundingBox();
        expect(box, 'tab should have a layout box').not.toBeNull();
        // boundingBox() reports x/width rather than right/right edges.
        const tabRight = (box?.x ?? 0) + (box?.width ?? 0);
        const navRight = (navBox?.x ?? 0) + (navBox?.width ?? 0);
        expect(tabRight).toBeLessThanOrEqual(navRight + 1);
        expect(box?.width ?? 0).toBeGreaterThan(0);
      }
    });

    test('meets the minimum touch target for primary controls', async ({ page }) => {
      await page.goto(appUrl('/'));

      const controls = [
        page.getByRole('link', { name: 'Vaultara' }),
        page.getByRole('link', { name: 'Favorites' }),
        page.getByRole('button', { name: 'Account menu' }),
      ];

      for (const control of controls) {
        const box = await control.boundingBox();
        expect(box, 'control should have a layout box').not.toBeNull();
        // Design spec 4.3 requires 44 x 44 CSS px.
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
        expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
      }
    });
  });
}

test.describe('keyboard access', () => {
  test('the skip link is the first stop and moves focus to main', async ({ page }) => {
    await page.goto(appUrl('/'));

    // `goto` resolves on the load event, which can precede React's first render. Pressing Tab
    // before the shell mounts sends the key to an empty document and the next test would be
    // testing nothing.
    const skip = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skip).toBeVisible();

    await page.keyboard.press('Tab');
    await expect(skip).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
  });

  test('focus is visible on interactive controls', async ({ page }) => {
    await page.goto(appUrl('/'));
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeVisible();

    await page.keyboard.press('Tab');

    const outline = await page.evaluate(() => {
      const element = document.activeElement;
      if (element === null) return '';
      const style = window.getComputedStyle(element);
      return `${style.outlineStyle} ${style.outlineWidth}`;
    });

    expect(outline).not.toMatch(/^none|^ /);
  });

  test('focus moves to main after client-side navigation', async ({ page }) => {
    await page.goto(appUrl('/'));

    await page.getByRole('link', { name: 'Favorites' }).click();

    await expect(page.getByRole('main')).toBeFocused();
  });

  test('the account menu closes on Escape and restores focus', async ({ page }) => {
    await page.goto(appUrl('/'));

    const trigger = page.getByRole('button', { name: 'Account menu' });
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await page.keyboard.press('Escape');

    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
  });
});

test.describe('mobile search', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('collapses behind a toggle and expands into a usable field', async ({ page }) => {
    await page.goto(appUrl('/'));

    // The desktop field is hidden at this width; the toggle is the entry point.
    await expect(page.getByRole('searchbox', { name: 'Search all providers' })).toBeHidden();

    await page.getByRole('button', { name: 'Open search' }).click();

    const input = page.getByRole('searchbox', { name: 'Search all providers' });
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();

    await input.fill('ada lovelace');
    await input.press('Enter');

    await expect(page).toHaveURL(appUrlPattern('/search?q=ada%20lovelace'));
  });
});
