import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * The path prefix the application is served from.
 *
 * GitHub Pages serves a *project* site from `https://<owner>.github.io/<repository>/`, so both
 * the emitted asset URLs and the client router must carry that prefix. A user or organisation
 * site (`<owner>.github.io`) and a custom domain are served from the domain root instead, which
 * build and deploy workflows select by setting `VITE_BASE_PATH=/`.
 *
 * The default matches this repository's name. Keeping it identical for development, build, and
 * preview means a path bug shows up locally instead of only on the deployed site.
 */
const DEFAULT_BASE_PATH = '/Vaultara/';

/**
 * Coerces any reasonable spelling of a base path into Vite's required form: a leading slash and
 * a trailing slash, or exactly `/` for a root deployment.
 */
function normaliseBasePath(value: string): string {
  const withoutSlashes = value.trim().replace(/^\/+/, '').replace(/\/+$/, '');

  return withoutSlashes === '' ? '/' : `/${withoutSlashes}/`;
}

const basePath = normaliseBasePath(process.env.VITE_BASE_PATH ?? DEFAULT_BASE_PATH);

// Vaultara build configuration.
//
// The dev server binds to all interfaces so the sandboxed preview proxy can reach it, and
// `allowedHosts` is opened because that proxy forwards a non-localhost Host header. Both
// settings are development-server only; they have no effect on the production bundle.
export default defineConfig({
  base: basePath,
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    globals: false,
    css: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    restoreMocks: true,
  },
});
