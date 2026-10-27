import type { ReactNode } from 'react';
import type { RouteObject } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { designSystemRoute } from '../dev/designSystemRoute';
import { AdultAccessGate } from '../pages/AdultAccessGate';
import { CategoryPage } from '../pages/CategoryPage';
import { CollectionPage } from '../pages/CollectionPage';
import { DownloadsPage } from '../pages/DownloadsPage';
import { FavoritesPage } from '../pages/FavoritesPage';
import { HistoryPage } from '../pages/HistoryPage';
import { HomePage } from '../pages/HomePage';
import { OnboardingPage } from '../pages/OnboardingPage';
import { ItemPage } from '../pages/ItemPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProviderPage } from '../pages/ProviderPage';
import { RouteErrorPage } from '../pages/RouteErrorPage';
import { SearchPage } from '../pages/SearchPage';
import { ViewerPage } from '../pages/ViewerPage';
import {
  SettingsCategoriesSection,
  SettingsContentSection,
  SettingsOverviewSection,
  SettingsPrivacySection,
  SettingsProvidersSection,
} from '../pages/settings/SettingsSections';
import { SettingsPage } from '../pages/settings/SettingsPage';

function withAdultGate(page: ReactNode) {
  return <AdultAccessGate>{page}</AdultAccessGate>;
}

export interface RouteOptions {
  /**
   * Registers development-only routes such as the design system reference. Wired to
   * `import.meta.env.DEV` so the page never reaches a production build.
   */
  readonly includeDevRoutes?: boolean;
}

/**
 * Application routes (design spec section 22).
 *
 * Every route renders a real page, even where the feature behind it is not implemented yet:
 * those pages state their status explicitly rather than presenting inactive controls as
 * working functionality.
 */
export function createRoutes({ includeDevRoutes = false }: RouteOptions = {}): RouteObject[] {
  return [
    {
      path: '/',
      element: <AppLayout />,
      errorElement: <RouteErrorPage />,
      children: [
        { index: true, element: <HomePage /> },
        { path: 'provider/:providerId', element: withAdultGate(<ProviderPage />) },
        { path: 'category/:categoryId', element: <CategoryPage /> },
        {
          path: 'collection/:providerId/:collectionId',
          element: withAdultGate(<CollectionPage />),
        },
        { path: 'item/:providerId/:itemId', element: withAdultGate(<ItemPage />) },
        { path: 'search', element: <SearchPage /> },
        { path: 'favorites', element: <FavoritesPage /> },
        { path: 'history', element: <HistoryPage /> },
        { path: 'onboarding', element: <OnboardingPage /> },
        { path: 'downloads', element: <DownloadsPage /> },
        { path: 'viewer/:providerId/:itemId', element: withAdultGate(<ViewerPage />) },
        {
          path: 'settings',
          element: <SettingsPage />,
          children: [
            { index: true, element: <SettingsOverviewSection /> },
            { path: 'categories', element: <SettingsCategoriesSection /> },
            { path: 'providers', element: <SettingsProvidersSection /> },
            { path: 'privacy', element: <SettingsPrivacySection /> },
            { path: 'content', element: <SettingsContentSection /> },
          ],
        },
        ...(includeDevRoutes ? [designSystemRoute] : []),
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ];
}
