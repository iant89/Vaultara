#!/usr/bin/env node
/**
 * Verifies that `dist/` is deployable to GitHub Pages.
 *
 * The failure this exists to prevent is silent: a bundle built for the wrong base path still
 * opens at its own root locally while every asset 404s on Pages, or a deep link renders Pages'
 * default 404 because the routing fallback was never published.
 *
 * The base path is read from the built `index.html` rather than recomputed from configuration,
 * so this checks the artifact that will actually be uploaded. No browser is required, which
 * keeps it cheap enough to run in CI.
 *
 * Checks:
 *   1. Every root-absolute URL in index.html sits under the detected base and exists on disk.
 *   2. `404.html` exists and is byte-identical to `index.html`.
 *   3. Served the way Pages serves: the base root returns 200, and deep links return the shell
 *      with a 404 status so the client router can take over.
 *
 * Usage: node scripts/verify-pages-build.mjs [--verbose]
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';

const REPO_ROOT = join(import.meta.dirname, '..');
const OUT_DIR = join(REPO_ROOT, 'dist');
const VERBOSE = process.argv.includes('--verbose');
const PORT = Number(process.env.VAULTARA_VERIFY_PORT ?? 4321);

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

let failures = 0;

function pass(message) {
  console.log(`  ok    ${message}`);
}

function fail(message) {
  failures += 1;
  console.log(`  FAIL  ${message}`);
}

function fatal(message) {
  console.error(`verify-pages-build: ${message}`);
  process.exit(1);
}

if (!existsSync(join(OUT_DIR, 'index.html'))) {
  fatal('dist/index.html is missing. Run `npm run build` first.');
}

const indexHtml = readFileSync(join(OUT_DIR, 'index.html'), 'utf8');

/** Root-absolute URLs referenced by the built shell (scripts, styles, icons, preloads). */
const assetUrls = [...indexHtml.matchAll(/\b(?:src|href)="(\/[^"]*)"/g)]
  .map((match) => match[1])
  .filter((url) => !url.startsWith('//'));

if (assetUrls.length === 0) {
  fatal('no root-absolute asset URLs found in dist/index.html; the build looks wrong.');
}

/**
 * The base path is whatever precedes the bundled asset directory. Vite emits `/assets/...` for a
 * root deployment and `/<base>/assets/...` otherwise, so this recovers it without trusting the
 * configuration that produced the build.
 */
const assetsMarker = '/assets/';
const firstAsset = assetUrls.find((url) => url.includes(assetsMarker));

if (firstAsset === undefined) {
  fatal(`no /assets/ URL found in dist/index.html; cannot determine the base path.`);
}

const basePath = firstAsset.slice(0, firstAsset.indexOf(assetsMarker) + 1);

console.log(`verify-pages-build: dist/ detects base path ${JSON.stringify(basePath)}`);

// ---------------------------------------------------------------- 1. asset paths
for (const url of assetUrls) {
  if (!url.startsWith(basePath)) {
    fail(`${url} is not under the base path ${basePath}; it will 404 on Pages`);
    continue;
  }

  const relative = url.slice(basePath.length).split('?')[0].split('#')[0];
  const filePath = join(OUT_DIR, normalize(relative));

  if (!filePath.startsWith(OUT_DIR + sep)) {
    fail(`${url} escapes the output directory`);
    continue;
  }

  if (!existsSync(filePath)) {
    fail(`${url} is referenced by index.html but ${relative} does not exist in dist/`);
    continue;
  }

  if (VERBOSE) {
    console.log(`        ${url} (${(statSync(filePath).size / 1024).toFixed(1)} kB)`);
  }
}

pass(`${assetUrls.length} asset URL(s) resolve under the base path`);

// ----------------------------------------------------------------- 2. routing fallback
const notFoundFile = join(OUT_DIR, '404.html');

if (!existsSync(notFoundFile)) {
  fail('dist/404.html is missing; deep links would show the Pages default 404 page');
} else if (!readFileSync(notFoundFile).equals(Buffer.from(indexHtml, 'utf8'))) {
  fail('dist/404.html does not match dist/index.html; rebuild so they stay in step');
} else {
  pass('dist/404.html mirrors the application shell');
}

// ------------------------------------------------------------------ 3. Pages-like serving
/** Resolves a URL path to a file in dist, or null. Mirrors Pages' static file handling. */
function resolveFile(pathname) {
  const decoded = decodeURIComponent(pathname);
  const relative = decoded.slice(basePath.length);

  if (relative === '' || relative.endsWith('/')) {
    return join(OUT_DIR, relative, 'index.html');
  }

  return join(OUT_DIR, normalize(relative));
}

const server = createServer((request, response) => {
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
  const filePath = resolveFile(pathname);

  if (
    filePath !== null &&
    filePath.startsWith(OUT_DIR + sep) &&
    existsSync(filePath) &&
    statSync(filePath).isFile()
  ) {
    response.writeHead(200, {
      'content-type': CONTENT_TYPES[extname(filePath)] ?? 'application/octet-stream',
    });
    response.end(readFileSync(filePath));
    return;
  }

  // Anything unmatched is answered with the shell and a 404 status, as GitHub Pages does.
  if (existsSync(notFoundFile)) {
    response.writeHead(404, { 'content-type': CONTENT_TYPES['.html'] });
    response.end(readFileSync(notFoundFile));
    return;
  }

  response.writeHead(404, { 'content-type': CONTENT_TYPES['.txt'] });
  response.end('Not Found');
});

const DEEP_LINKS = ['favorites', 'settings/privacy', 'item/archive-org/nosferatu', 'no-such-page'];

await new Promise((resolve) => {
  server.listen(PORT, '127.0.0.1', resolve);
});

try {
  const rootResponse = await fetch(`http://127.0.0.1:${PORT}${basePath}`);

  if (rootResponse.status === 200) {
    pass(`${basePath} returns 200`);
  } else {
    fail(`${basePath} returned ${rootResponse.status}; expected 200`);
  }

  for (const url of assetUrls) {
    const response = await fetch(`http://127.0.0.1:${PORT}${url}`);

    if (response.status !== 200) {
      fail(`${url} returned ${response.status} over HTTP`);
    }
  }

  pass('every referenced asset is served');

  for (const link of DEEP_LINKS) {
    const url = `${basePath}${link}`;
    const response = await fetch(`http://127.0.0.1:${PORT}${url}`);
    const body = await response.text();
    const isShell = body.includes('<div id="root">') && body.includes(basePath);

    if (response.status === 404 && isShell) {
      pass(`${url} serves the shell so the router can resolve it`);
    } else {
      fail(`${url} returned ${response.status}${isShell ? '' : ' without the application shell'}`);
    }
  }
} finally {
  server.close();
}

console.log();

if (failures > 0) {
  console.log(`verify-pages-build: ${failures} problem(s) found.`);
  process.exit(1);
}

console.log('verify-pages-build: dist/ is deployable to GitHub Pages.');
