/**
 * Onboarding, exploration tracking, and discovery filtering (roadmap Phase 7).
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { createRoutes } from '../app/routes';
import { PRIMARY_PROVIDER_ID } from '../config/discovery';
import { SessionProvider } from '../data/SessionContext';
import { ProviderServicesProvider, type ProviderServices } from '../data/ProviderServices';
import { createContentQueries } from '../data/contentQueries';
import { DEFAULT_PREFERENCES, type UserPreferences } from '../models/account';
import type { ContentItem } from '../models/content';
import { createPaginatedResult } from '../models/pagination';
import { createTestPersistence } from '../persistence/composition';
import { ProviderGateway } from '../providers/gateway';
import { ProviderRegistry } from '../providers/registry';
import { createFakeProvider, makeCollection, makeItem } from '../test/fakeProvider';

const ARCHIVE = PRIMARY_PROVIDER_ID;
const PASSWORD = 'correct horse';

const ITEM: ContentItem = makeItem({
  id: 'night_of_the_living_dead',
  providerId: ARCHIVE,
  title: 'Night of the Living Dead',
  type: 'movie',
});

function createServices(): ProviderServices {
  const search = vi.fn(
    async (_text: string, options?: { contentTypes?: readonly string[]; pageSize?: number }) => {
      const family = options?.contentTypes?.[0] ?? 'all';

      return createPaginatedResult(
        [
          makeItem({
            id: `search-${family}`,
            providerId: ARCHIVE,
            title: `Fresh ${family}`,
            type: 'movie',
          }),
        ],
        { page: 1, pageSize: options?.pageSize ?? 24 },
      );
    },
  );

  const registry = new ProviderRegistry();
  registry.register(
    createFakeProvider({
      id: ARCHIVE,
      name: 'Internet Archive',
      search,
      getItem: async (itemId: string) =>
        itemId === ITEM.id ? ITEM : makeItem({ id: itemId, providerId: ARCHIVE, title: itemId }),
      getCollection: async (collectionId: string) =>
        makeCollection({
          id: collectionId,
          providerId: ARCHIVE,
          title: 'Feature Films',
          categoryIds: ['movies'],
          metadata: { mediatype: 'collection', is_collection: true },
        }),
      getCollectionItems: async () =>
        createPaginatedResult([ITEM], { page: 1, pageSize: 24, total: 1 }),
      getSubcollections: async () => createPaginatedResult([], { page: 1, pageSize: 6, total: 0 }),
      getRelatedItems: async () => createPaginatedResult([], { page: 1, pageSize: 12, total: 0 }),
      getAvailableFiles: async () => [],
      getCategories: async () => [],
    }),
  );

  const gateway = new ProviderGateway(registry, {
    retry: { maxAttempts: 1, baseDelayMs: 1, maxDelayMs: 1, jitterRatio: 0 },
    sleep: () => Promise.resolve(),
  });

  return { runtime: { registry, gateway }, queries: createContentQueries(gateway) };
}

async function signedInBackend(preferences: Partial<UserPreferences> = {}) {
  const backend = createTestPersistence();
  const session = await backend.createAccount({
    email: 'alex@example.com',
    password: PASSWORD,
    displayName: 'Alex',
  });
  await backend.setPreferences(session.sessionId, {
    ...DEFAULT_PREFERENCES,
    onboardingCompleted: true,
    ...preferences,
  });
  return { backend, session };
}

function renderAt(path: string, backend: ReturnType<typeof createTestPersistence>) {
  const router = createMemoryRouter(createRoutes(), { initialEntries: [path] });

  render(
    <SessionProvider backend={backend}>
      <ProviderServicesProvider services={createServices()}>
        <RouterProvider router={router} />
      </ProviderServicesProvider>
    </SessionProvider>,
  );

  return router;
}

describe('onboarding', () => {
  it('asks a new account to choose categories and skip keeps every discovery row', async () => {
    const user = userEvent.setup();
    const backend = createTestPersistence();
    await backend.createAccount({
      email: 'alex@example.com',
      password: PASSWORD,
      displayName: 'Alex',
    });

    renderAt('/', backend);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Choose your categories' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Skip' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Discovery' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Films' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Books and documents' }),
    ).toBeInTheDocument();
  });

  it('builds the home page around the selected categories', async () => {
    const user = userEvent.setup();
    const backend = createTestPersistence();
    await backend.createAccount({
      email: 'alex@example.com',
      password: PASSWORD,
      displayName: 'Alex',
    });

    renderAt('/', backend);
    await screen.findByRole('heading', { level: 1, name: 'Choose your categories' });

    await user.click(screen.getByRole('button', { name: /^Films/ }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Discovery' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Films' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Books and documents' })).toBeNull();
  });
});

describe('exploration tracking', () => {
  it('marks an item explored from its details page', async () => {
    const { backend, session } = await signedInBackend();
    renderAt(`/item/${ARCHIVE}/${ITEM.id}`, backend);

    expect(await screen.findByRole('heading', { level: 1, name: ITEM.title })).toBeInTheDocument();

    await waitFor(async () => {
      const state = await backend.getContentState(session.sessionId, {
        providerId: ARCHIVE,
        itemId: ITEM.id,
      });
      expect(state?.explored).toBe(true);
      expect(state?.firstExploredAt).toBeDefined();
    });
  });

  it('does not mark collection members explored when the collection is opened', async () => {
    const { backend, session } = await signedInBackend();
    renderAt(`/collection/${ARCHIVE}/feature_films`, backend);

    expect(await screen.findByText(ITEM.title)).toBeInTheDocument();
    expect(await backend.listContentState(session.sessionId)).toEqual([]);
  });

  it('does not record a visit when history tracking is disabled', async () => {
    const { backend, session } = await signedInBackend({ historyTrackingEnabled: false });
    renderAt(`/item/${ARCHIVE}/${ITEM.id}`, backend);

    expect(await screen.findByRole('heading', { level: 1, name: ITEM.title })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Other viewers is not available yet/)).toBeInTheDocument();
    });

    expect(
      await backend.getContentState(session.sessionId, { providerId: ARCHIVE, itemId: ITEM.id }),
    ).toBeUndefined();
  });
});

describe('discovery filtering', () => {
  it('hides explored items on the home page', async () => {
    const { backend, session } = await signedInBackend();
    await backend.putContentState(session.sessionId, {
      providerId: ARCHIVE,
      itemId: 'search-movie',
      liked: false,
      favorited: false,
      explored: true,
    });

    renderAt('/', backend);

    expect(await screen.findByRole('heading', { level: 1, name: 'Discovery' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: 'Audio' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Fresh movie')).toBeNull();
    });
  });

  it('still shows an explored item on a collection page', async () => {
    const { backend, session } = await signedInBackend();
    await backend.putContentState(session.sessionId, {
      providerId: ARCHIVE,
      itemId: ITEM.id,
      liked: false,
      favorited: false,
      explored: true,
    });

    renderAt(`/collection/${ARCHIVE}/feature_films`, backend);

    expect(await screen.findByText(ITEM.title)).toBeInTheDocument();
  });

  it('keeps liked explored items eligible for rediscovery', async () => {
    const { backend, session } = await signedInBackend();
    await backend.putContentState(session.sessionId, {
      providerId: ARCHIVE,
      itemId: 'search-movie',
      liked: true,
      favorited: false,
      explored: true,
    });

    renderAt('/', backend);

    expect(await screen.findByRole('heading', { level: 1, name: 'Discovery' })).toBeInTheDocument();
    expect((await screen.findAllByText('Fresh movie')).length).toBeGreaterThan(0);
  });
});

describe('history and privacy', () => {
  it('lists explored items and reset keeps a favorite', async () => {
    const user = userEvent.setup();
    const { backend, session } = await signedInBackend();
    await backend.putContentState(session.sessionId, {
      providerId: ARCHIVE,
      itemId: ITEM.id,
      liked: false,
      favorited: true,
      explored: true,
      firstExploredAt: '2026-10-01T00:00:00.000Z',
      lastExploredAt: '2026-10-26T00:00:00.000Z',
      explorationCount: 2,
    });
    await backend.putContentState(session.sessionId, {
      providerId: ARCHIVE,
      itemId: 'only-seen',
      liked: false,
      favorited: false,
      explored: true,
      lastExploredAt: '2026-10-25T00:00:00.000Z',
    });

    renderAt('/history', backend);

    expect(await screen.findByRole('link', { name: ITEM.title })).toHaveAttribute(
      'href',
      `/item/${ARCHIVE}/${ITEM.id}`,
    );
    expect(screen.getByRole('link', { name: 'only-seen' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reset exploration history' }));

    await waitFor(async () => {
      const rows = await backend.listContentState(session.sessionId);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        itemId: ITEM.id,
        favorited: true,
        explored: false,
      });
    });

    expect(screen.queryByRole('link', { name: ITEM.title })).toBeNull();
    expect(screen.queryByRole('link', { name: 'only-seen' })).toBeNull();
  });

  it('persists category and privacy preferences from Settings', async () => {
    const user = userEvent.setup();
    const { backend, session } = await signedInBackend();
    renderAt('/settings/categories', backend);

    const films = await screen.findByRole('button', { name: /^Films/ });
    await user.click(films);

    await waitFor(async () => {
      expect((await backend.getPreferences(session.sessionId)).selectedCategoryIds).toEqual([
        'movies',
      ]);
    });

    renderAt('/settings/privacy', backend);

    const tracking = await screen.findByRole('checkbox', { name: /Record exploration history/ });
    expect(tracking).toBeChecked();
    await user.click(tracking);

    await waitFor(async () => {
      expect((await backend.getPreferences(session.sessionId)).historyTrackingEnabled).toBe(false);
    });
  });
});
