import type { RouteObject } from 'react-router-dom';

/**
 * Lazily loaded registration for the development-only design system page.
 *
 * The page and its sample fixtures are imported dynamically so they land in a separate chunk
 * instead of the initial bundle. The route is only ever registered when
 * `import.meta.env.DEV` is true, so production builds never request the chunk.
 */
export const designSystemRoute: RouteObject = {
  path: 'design-system',
  lazy: async () => {
    const { DesignSystemPage } = await import('../pages/DesignSystemPage');
    return { Component: DesignSystemPage };
  },
};
