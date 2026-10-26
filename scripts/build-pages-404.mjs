#!/usr/bin/env node
/**
 * Publishes the application shell as `404.html`.
 *
 * GitHub Pages serves static files only and has no rewrite rules, so a deep link such as
 * `/Vaultara/favorites` would return Pages' own 404 page and never reach the application. The
 * documented workaround is to publish the single-page shell as `404.html`: Pages serves that
 * file, with a 404 status, for any unmatched path; the application then boots and the client
 * router renders the requested route.
 *
 * This runs automatically after every build (`postbuild` in package.json) so the build output is
 * always directly deployable.
 *
 * The trade-off is honest and worth stating: direct navigation to a deep link returns HTTP 404
 * rather than 200. That is correct in the sense that the *server* has no such resource, and it
 * keeps links shareable. Hash routing would avoid the status code but produce ugly URLs and
 * break the documented route paths.
 */
import { copyFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(import.meta.dirname, '..');
const OUT_DIR = join(REPO_ROOT, 'dist');
const INDEX_FILE = join(OUT_DIR, 'index.html');
const NOT_FOUND_FILE = join(OUT_DIR, '404.html');

if (!existsSync(INDEX_FILE)) {
  console.error(`postbuild: expected ${INDEX_FILE} to exist. Run \`vite build\` first.`);
  process.exit(1);
}

copyFileSync(INDEX_FILE, NOT_FOUND_FILE);

const kilobytes = (statSync(NOT_FOUND_FILE).size / 1024).toFixed(1);
console.log(
  `postbuild: wrote dist/404.html (${kilobytes} kB) as the client-side routing fallback.`,
);
