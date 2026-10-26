import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ProviderServicesProvider, type ProviderServices } from '../data/ProviderServices';
import { createContentQueries } from '../data/contentQueries';
import { ProviderGateway } from '../providers/gateway';
import { ProviderRegistry } from '../providers/registry';
import { createFakeProvider } from '../test/fakeProvider';
import { createRoutes } from './routes';

/**
 * Routing is asserted without data: every discovery page is wired to a provider whose requests
 * never settle, so a route renders its loading state, issues no network traffic, and cannot
 * produce a late state update after the test ends.
 */
function createPendingServices(): ProviderServices {
  const pending = <T,>(): Promise<T> => new Promise<T>(() => {});

  const registry = new ProviderRegistry();
  registry.register(
    createFakeProvider({
      id: 'archive',
      name: 'Internet Archive',
      getCategories: () => pending(),
      getCollections: () => pending(),
      getCollection: () => pending(),
      getCollectionItems: () => pending(),
      getItem: () => pending(),
      getRelatedItems: () => pending(),
      getAvailableFiles: () => pending(),
      search: () => pending(),
    }),
  );

  const gateway = new ProviderGateway(registry, {
    retry: { maxAttempts: 1, baseDelayMs: 1, maxDelayMs: 1, jitterRatio: 0 },
    sleep: () => Promise.resolve(),
  });

  return { runtime: { registry, gateway }, queries: createContentQueries(gateway) };
}

function renderPath(path: string, { includeDevRoutes = false } = {}) {
  const router = createMemoryRouter(createRoutes({ includeDevRoutes }), {
    initialEntries: [path],
  });

  return render(
    <ProviderServicesProvider services={createPendingServices()}>
      <RouterProvider router={router} />
    </ProviderServicesProvider>,
  );
}

const ROUTE_CASES: ReadonlyArray<readonly [path: string, heading: string]> = [
  ['/', 'Discovery'],
  ['/provider/archive', 'Internet Archive'],
  ['/provider/wikipedia', 'Wikipedia'],
  ['/category/books', 'Category'],
  ['/collection/archive/classic-films', 'Collection'],
  ['/item/archive/night_of_the_living_dead', 'Item details'],
  ['/search', 'Search'],
  ['/favorites', 'Favorites'],
  ['/history', 'History'],
  ['/downloads', 'Downloads'],
  ['/viewer/archive/night_of_the_living_dead', 'Viewer'],
  ['/settings', 'Settings'],
];

// Regression cover for the routing table in design spec 22: every documented route must
// render a real page rather than throwing or returning a blank document.
describe.each(ROUTE_CASES)('%s', (path, heading) => {
  it(`renders the "${heading}" page`, () => {
    renderPath(path);

    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });
});

describe('shared layout', () => {
  it('provides a skip link that targets the main landmark', () => {
    renderPath('/');

    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main-content',
    );
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it('renders the global navigation on every route', () => {
    renderPath('/favorites');

    expect(screen.getByRole('navigation', { name: 'Providers' })).toBeInTheDocument();
    expect(screen.getByRole('search')).toBeInTheDocument();
  });

  it('states source attribution in the footer', () => {
    renderPath('/');

    expect(screen.getByText(/third-party sources/)).toBeInTheDocument();
  });

  // Regression guard for SPA focus handling: without this, keyboard and screen-reader users
  // stay on the old page's content after navigating (design spec 27).
  it('moves focus to the main landmark after navigating', async () => {
    renderPath('/');

    await userEvent.click(screen.getByRole('link', { name: 'Favorites' }));

    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('does not steal focus on first render', () => {
    renderPath('/');

    expect(document.body).toHaveFocus();
  });
});

describe('settings routes', () => {
  it.each([
    ['/settings', 'Overview'],
    ['/settings/categories', 'Categories'],
    ['/settings/providers', 'Providers'],
    ['/settings/privacy', 'Privacy'],
    ['/settings/content', 'Content visibility'],
  ])('%s keeps the Settings heading and shows the %s section', (path, sectionHeading) => {
    renderPath(path);

    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: sectionHeading })).toBeInTheDocument();
  });
});

describe('provider routes', () => {
  it('reports an unknown provider instead of failing', () => {
    renderPath('/provider/not-a-provider');

    expect(screen.getByRole('heading', { level: 1, name: 'Unknown provider' })).toBeInTheDocument();
    expect(screen.getByText(/No provider is configured as "not-a-provider"/)).toBeInTheDocument();
  });

  it('disables the Adult provider by default', () => {
    renderPath('/provider/adult');

    expect(screen.getByText('The Adult provider is disabled')).toBeInTheDocument();
  });
});

describe('honest feature status', () => {
  // Discovery reads real provider data now, so the remaining status claim on the home page is
  // personalisation: it must still say it is not implemented rather than imply recommendations
  // are merely empty (roadmap 5.1).
  it('states that personalisation is not implemented on the discovery page', () => {
    renderPath('/');

    expect(screen.getByText('Personal recommendations is not available yet')).toBeInTheDocument();
    expect(screen.getByText('Not implemented')).toBeInTheDocument();
  });

  it('offers a trail back to the provider from an item', () => {
    renderPath('/item/archive/example-item');

    const crumbs = within(screen.getByRole('navigation', { name: 'Breadcrumb' }));

    expect(crumbs.getByRole('link', { name: 'Internet Archive' })).toHaveAttribute(
      'href',
      '/provider/archive',
    );
  });

  it('shows the canonical content identity on the viewer route', () => {
    renderPath('/viewer/wikipedia/Ada_Lovelace');

    expect(screen.getByText(/"wikipedia:Ada_Lovelace"/)).toBeInTheDocument();
  });
});

describe('design system route', () => {
  it('is absent from the route table unless development routes are enabled', () => {
    renderPath('/design-system');

    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
  });

  it('renders the reference page when explicitly enabled', async () => {
    renderPath('/design-system', { includeDevRoutes: true });

    // The page is code-split, so it resolves after a dynamic import.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Design system' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Development only.')).toBeInTheDocument();
  });
});

describe('unknown routes', () => {
  it('renders a useful not-found page with a way back', () => {
    renderPath('/this/route/does/not/exist');

    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to discovery' })).toHaveAttribute('href', '/');
  });
});
