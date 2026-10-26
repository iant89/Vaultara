import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { APP_BASE_PATH } from './e2e/appBase';

/**
 * Chromium resolution.
 *
 * Browsers are not downloaded during `npm install`. `scripts/setup-deps.sh` provisions one and
 * verifies that it launches. Resolution order here matches that script:
 *
 *   1. `PLAYWRIGHT_CHROMIUM` - an explicit binary, verified by the script.
 *   2. Playwright's own managed browser - the normal case on a developer machine.
 *   3. `node_modules/.vaultara/chromium` - the extracted fallback used where the Playwright CDN
 *      is unreachable (sandboxed environments). It links against NSS/NSPR libraries that are
 *      extracted beside it, so `LD_LIBRARY_PATH` must include `lib/`, and it needs
 *      `--no-sandbox` because it runs as an unprivileged user inside a container.
 *
 * Run `scripts/setup-deps.sh --check` to confirm which of these applies.
 */
const FALLBACK_DIR = join(import.meta.dirname, 'node_modules', '.vaultara', 'chromium');
const FALLBACK_BIN = join(FALLBACK_DIR, 'chromium');

interface ChromiumTarget {
  readonly executablePath?: string;
  readonly env?: Record<string, string>;
  readonly args: readonly string[];
}

function resolveChromium(): ChromiumTarget {
  const override = process.env.PLAYWRIGHT_CHROMIUM;
  if (override !== undefined && override.length > 0 && existsSync(override)) {
    return { executablePath: override, args: [] };
  }

  if (existsSync(FALLBACK_BIN)) {
    return {
      executablePath: FALLBACK_BIN,
      env: {
        ...(process.env as Record<string, string>),
        LD_LIBRARY_PATH: [join(FALLBACK_DIR, 'lib'), process.env.LD_LIBRARY_PATH]
          .filter((value): value is string => value !== undefined && value.length > 0)
          .join(':'),
        HOME: process.env.HOME ?? '/tmp',
      },
      args: ['--no-sandbox'],
    };
  }

  // Playwright's managed browser; no override needed.
  return { args: [] };
}

const chromiumTarget = resolveChromium();

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    // Includes the deployment base path so the suite exercises the same URLs GitHub Pages serves.
    baseURL: `http://127.0.0.1:4173${APP_BASE_PATH}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          ...(chromiumTarget.executablePath !== undefined
            ? { executablePath: chromiumTarget.executablePath }
            : {}),
          ...(chromiumTarget.env !== undefined ? { env: chromiumTarget.env } : {}),
          args: [...chromiumTarget.args],
        },
      },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 4173 --strictPort',
    url: `http://127.0.0.1:4173${APP_BASE_PATH}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
