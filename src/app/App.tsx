import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { toRouterBasename } from './basePath';
import { createRoutes } from './routes';

/**
 * The router is configured with the base path the bundle was built for (see `vite.config.ts`).
 * On GitHub Pages the application is served from `/Vaultara/`, so without this every route would
 * fail to match and a direct link would land on the not-found page.
 */
const router = createBrowserRouter(
  createRoutes({
    // The design system reference is a development tool, not a product surface.
    includeDevRoutes: import.meta.env.DEV,
  }),
  { basename: toRouterBasename(import.meta.env.BASE_URL) },
);

export function App() {
  return <RouterProvider router={router} />;
}
