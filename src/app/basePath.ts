/**
 * Router base path handling.
 *
 * The application is served from a sub-path on GitHub Pages (`/Vaultara/`), while Vite's
 * `BASE_URL` always carries a trailing slash and is `/` for a root deployment. React Router
 * wants a bare prefix with no trailing slash, and an empty string at the root. This module is
 * the single translation point between the two conventions.
 */

/**
 * Converts Vite's `import.meta.env.BASE_URL` into a React Router `basename`.
 *
 * @param baseUrl Vite's base, with a leading and trailing slash (`/Vaultara/`), or `/` at the
 *   root. A leading slash is added if missing, because a basename without one silently fails to
 *   match anything.
 * @returns The basename, or an empty string when the application is served from the root.
 */
export function toRouterBasename(baseUrl: string): string {
  const withoutTrailingSlash = baseUrl.trim().replace(/\/+$/, '');

  if (withoutTrailingSlash === '') {
    return '';
  }

  return withoutTrailingSlash.startsWith('/') ? withoutTrailingSlash : `/${withoutTrailingSlash}`;
}
