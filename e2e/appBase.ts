/**
 * The path prefix the application is served from.
 *
 * GitHub Pages serves a project site from `/<repository>/`; a user site or custom domain is
 * served from the root. This mirrors the resolution in `vite.config.ts` so the suite navigates
 * to the same URLs the deployed site serves, rather than testing a root-mounted variant that
 * only ever exists locally.
 *
 * Override both consistently with `VITE_BASE_PATH`. The web server started by Playwright
 * inherits this process's environment, so one variable moves the app and the tests together.
 */
const configuredBase = process.env.VITE_BASE_PATH ?? '/Vaultara/';

const withoutSlashes = configuredBase.trim().replace(/^\/+/, '').replace(/\/+$/, '');

/** Base path with a leading and trailing slash, or `/` for a root deployment. */
export const APP_BASE_PATH = withoutSlashes === '' ? '/' : `/${withoutSlashes}/`;

/**
 * Builds an absolute path within the application, for `page.goto` and URL assertions.
 *
 * A leading slash on `route` is optional and ignored, so `appUrl('/favorites')` and
 * `appUrl('favorites')` are the same URL.
 */
export function appUrl(route = '/'): string {
  return `${APP_BASE_PATH}${route.replace(/^\/+/, '')}`;
}

/** Anchored regular expression matching `route`, for `expect(page).toHaveURL(...)`. */
export function appUrlPattern(route = '/'): RegExp {
  const escaped = appUrl(route).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return new RegExp(`${escaped}$`);
}
