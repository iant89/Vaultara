/**
 * Global search (roadmap Phase 9).
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { createRoutes } from '../app/routes';
import { PRIMARY_PROVIDER_ID } from '../config/discovery';
import { ProviderServicesProvider, type ProviderServices } from '../data/ProviderServices';
import { SessionProvider } from '../data/SessionContext';
import { createContentQueries } from '../data/contentQueries';
import { DEFAULT_PREFERENCES } from '../models/account';
import type { ContentItem } from '../models/content';
import { createAppError } from '../models/errors';
import { createPaginatedResult, type PaginatedResult } from '../models/pagination';
import type { SearchOptions } from '../models/provider';
import { createTestPersistence } from '../persistence/composition';
import { RECENT_SEARCH_STORAGE_KEY } from '../personalization/recentSearches';
import { ProviderGateway } from '../providers/gateway';
import { ProviderRegistry } from '../providers/registry';
import { createFakeProvider, makeItem } from '../test/fakeProvider';

const ARCHIVE = PRIMARY_PROVIDER_ID;

const NIGHT: ContentItem = makeItem({
  id: 'night_of_the_living_dead',
  providerId: ARCHIVE,
  title: 'Night of the Living Dead',
  type: 'movie',
  creator: 'George A. Romero',
});

function createServices(options?: {
  readonly extraProvider?: ReturnType<typeof createFakeProvider>;
  readonly archiveSearch?: (
    query: string,
    searchOptions?: SearchOptions,
  ) => Promise<PaginatedResult<ContentItem>>;
}): ProviderServices {
  const search =
    options?.archiveSearch ??
    (async (text: string, searchOptions?: SearchOptions) => {
      const page = searchOptions?.page ?? 1;
      const items =
        text.trim() === ''
          ? []
          : page === 1
            ? [
                NIGHT,
                makeItem({
                  id: 'explored-film',
                  providerId: ARCHIVE,
                  title: 'An explored film',
                  type: 'movie',
                }),
              ]
            : [
                makeItem({
                  id: 'second-page',
                  providerId: ARCHIVE,
                  title: 'A later match',
                  type: 'movie',
                }),
              ];

      return createPaginatedResult(items, {
        page,
        pageSize: searchOptions?.pageSize ?? 24,
        total: 3,
      });
    });

  const registry = new ProviderRegistry();
  registry.register(
    createFakeProvider({
      id: ARCHIVE,
      name: 'Internet Archive',
      capabilities: {
        contentTypes: ['movie', 'document', 'audio', 'image', 'software', 'website'],
      },
      search,
      getItem: async (itemId: string) =>
        itemId === NIGHT.id ? NIGHT : makeItem({ id: itemId, providerId: ARCHIVE, title: itemId }),
    }),
  );

  if (options?.extraProvider !== undefined) {
    registry.register(options.extraProvider);
  }

  const gateway = new ProviderGateway(registry, {
    retry: { maxAttempts: 1, baseDelayMs: 1, maxDelayMs: 1, jitterRatio: 0 },
    sleep: () => Promise.resolve(),
  });

  return { runtime: { registry, gateway }, queries: createContentQueries(gateway) };
}

function renderAt(
  path: string,
  options?: {
    readonly services?: ProviderServices;
    readonly backend?: ReturnType<typeof createTestPersistence>;
  },
) {
  const router = createMemoryRouter(createRoutes(), { initialEntries: [path] });
  const view = render(
    <SessionProvider backend={options?.backend ?? createTestPersistence()}>
      <ProviderServicesProvider services={options?.services ?? createServices()}>
        <RouterProvider router={router} />
      </ProviderServicesProvider>
    </SessionProvider>,
  );
  return { router, ...view };
}

describe('search page', () => {
  it('asks for a query instead of searching the entire catalogue', async () => {
    renderAt('/search');

    expect(await screen.findByRole('heading', { level: 1, name: 'Search' })).toBeInTheDocument();
    expect(screen.getByText('Search every enabled provider')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: NIGHT.title })).toBeNull();
  });

  it('lists results from an enabled provider and keeps explored items', async () => {
    const backend = createTestPersistence();
    const session = await backend.createAccount({
      email: 'alex@example.com',
      password: 'correct horse',
      displayName: 'Alex',
    });
    await backend.setPreferences(session.sessionId, {
      ...DEFAULT_PREFERENCES,
      onboardingCompleted: true,
    });
    await backend.putContentState(session.sessionId, {
      providerId: ARCHIVE,
      itemId: 'explored-film',
      liked: false,
      favorited: false,
      explored: true,
    });

    renderAt('/search?q=vampire', { backend });

    expect(await screen.findByRole('link', { name: NIGHT.title })).toHaveAttribute(
      'href',
      `/item/${ARCHIVE}/${NIGHT.id}`,
    );
    expect(screen.getByRole('link', { name: 'An explored film' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Internet Archive' })).toBeInTheDocument();
  });

  it('does not query a disabled provider', async () => {
    let wikiCalls = 0;
    const services = createServices({
      extraProvider: createFakeProvider({
        id: 'wikipedia',
        name: 'Wikipedia',
        search: async () => {
          wikiCalls += 1;
          return createPaginatedResult(
            [makeItem({ id: 'wiki-1', providerId: 'wikipedia', title: 'A Wikipedia hit' })],
            { page: 1, pageSize: 24, total: 1 },
          );
        },
      }),
    });
    const backend = createTestPersistence();
    const session = await backend.createAccount({
      email: 'alex@example.com',
      password: 'correct horse',
      displayName: 'Alex',
    });
    await backend.setPreferences(session.sessionId, {
      ...DEFAULT_PREFERENCES,
      onboardingCompleted: true,
      disabledProviderIds: ['wikipedia'],
    });

    renderAt('/search?q=vampire', { services, backend });

    expect(await screen.findByRole('link', { name: NIGHT.title })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'A Wikipedia hit' })).toBeNull();
    expect(wikiCalls).toBe(0);
  });

  it('keeps successful results when another provider fails', async () => {
    const services = createServices({
      extraProvider: createFakeProvider({
        id: 'wikipedia',
        name: 'Wikipedia',
        search: async () => {
          throw createAppError(
            'rate-limited',
            'This provider is receiving too many requests. Please try again shortly.',
          );
        },
      }),
    });

    renderAt('/search?q=vampire', { services });

    expect(await screen.findByRole('link', { name: NIGHT.title })).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent(/too many requests/i);
    expect(screen.getByRole('heading', { level: 2, name: 'Wikipedia' })).toBeInTheDocument();
  });

  it('reports an empty provider result without inventing matches', async () => {
    const services = createServices({
      archiveSearch: async () => createPaginatedResult([], { page: 1, pageSize: 24, total: 0 }),
    });

    renderAt('/search?q=nope', { services });

    expect(await screen.findByText('No results from Internet Archive')).toBeInTheDocument();
  });

  it('sends sort and type through the URL', async () => {
    let lastOptions: SearchOptions | undefined;
    const services = createServices({
      archiveSearch: async (_text, searchOptions) => {
        lastOptions = searchOptions;
        return createPaginatedResult([NIGHT], { page: 1, pageSize: 24, total: 1 });
      },
    });
    const { router } = renderAt('/search?q=vampire', { services });

    await screen.findByRole('link', { name: NIGHT.title });

    await userEvent.selectOptions(screen.getByLabelText('Sort by'), 'Newest by date');
    expect(router.state.location.search).toContain('sort=date-desc');

    await userEvent.selectOptions(screen.getByLabelText('Content type'), 'Film');
    expect(router.state.location.search).toContain('type=movie');

    await waitFor(() => {
      expect(lastOptions).toMatchObject({ sort: 'date-desc', contentTypes: ['movie'] });
    });
  });

  it('appends the next page of results', async () => {
    renderAt('/search?q=vampire');

    expect(await screen.findByRole('link', { name: NIGHT.title })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'A later match' })).toBeNull();

    await userEvent.click(
      screen.getByRole('button', { name: 'View more Internet Archive results' }),
    );

    expect(await screen.findByRole('link', { name: 'A later match' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: NIGHT.title })).toBeInTheDocument();
  });

  it('remembers a submitted query on the empty search page', async () => {
    localStorage.removeItem(RECENT_SEARCH_STORAGE_KEY);
    const first = renderAt('/search?q=vampire');
    await screen.findByRole('link', { name: NIGHT.title });
    first.unmount();

    renderAt('/search');

    const recents = await screen.findByRole('list', { name: 'Recent searches' });
    expect(within(recents).getByRole('link', { name: 'vampire' })).toHaveAttribute(
      'href',
      '/search?q=vampire',
    );
  });
});
