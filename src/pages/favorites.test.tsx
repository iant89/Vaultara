/**
 * Global favorites and likes (roadmap Phase 8).
 */

import { render, screen, waitFor } from '@testing-library/react';
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
import { createPaginatedResult } from '../models/pagination';
import { createTestPersistence } from '../persistence/composition';
import { createPersistenceError } from '../persistence/errors';
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
  const registry = new ProviderRegistry();
  registry.register(
    createFakeProvider({
      id: ARCHIVE,
      name: 'Internet Archive',
      search: async (_text, options) => {
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
      getItem: async (itemId: string) => {
        if (itemId === 'missing-item') {
          throw createAppError('not-found', 'That item is gone.');
        }

        return itemId === ITEM.id
          ? ITEM
          : makeItem({ id: itemId, providerId: ARCHIVE, title: itemId });
      },
      getCollection: async (collectionId: string) =>
        makeCollection({
          id: collectionId,
          providerId: ARCHIVE,
          title: 'Feature Films',
          categoryIds: ['movies'],
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

async function signedInBackend() {
  const backend = createTestPersistence();
  const session = await backend.createAccount({
    email: 'alex@example.com',
    password: PASSWORD,
    displayName: 'Alex',
  });
  await backend.setPreferences(session.sessionId, {
    ...DEFAULT_PREFERENCES,
    onboardingCompleted: true,
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

describe('favorites page', () => {
  it('asks unsigned visitors to sign in', async () => {
    renderAt('/favorites', createTestPersistence());

    expect(await screen.findByText('Sign in to save favorites')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Settings' })).toHaveAttribute(
      'href',
      '/settings',
    );
  });

  it('starts empty for a signed-in account', async () => {
    const { backend } = await signedInBackend();
    renderAt('/favorites', backend);

    expect(await screen.findByText('Nothing saved yet')).toBeInTheDocument();
  });

  it('lists a favorited item and not a liked-only item', async () => {
    const { backend, session } = await signedInBackend();
    await backend.putContentState(session.sessionId, {
      providerId: ARCHIVE,
      itemId: ITEM.id,
      liked: false,
      favorited: true,
      explored: false,
      favoritedAt: '2026-10-26T00:00:00.000Z',
      snapshot: { title: ITEM.title, type: 'movie' },
    });
    await backend.putContentState(session.sessionId, {
      providerId: ARCHIVE,
      itemId: 'only-liked',
      liked: true,
      favorited: false,
      explored: false,
      snapshot: { title: 'Only liked', type: 'movie' },
    });

    renderAt('/favorites', backend);

    expect(await screen.findByRole('link', { name: ITEM.title })).toHaveAttribute(
      'href',
      `/item/${ARCHIVE}/${ITEM.id}`,
    );
    expect(screen.queryByRole('link', { name: 'Only liked' })).toBeNull();
  });

  it('keeps a snapshot when the provider cannot be reached', async () => {
    const { backend, session } = await signedInBackend();
    await backend.putContentState(session.sessionId, {
      providerId: ARCHIVE,
      itemId: 'missing-item',
      liked: false,
      favorited: true,
      explored: false,
      favoritedAt: '2026-10-26T00:00:00.000Z',
      snapshot: { title: 'A vanished film', type: 'movie' },
    });

    renderAt('/favorites', backend);

    expect(await screen.findByRole('link', { name: 'A vanished film' })).toBeInTheDocument();
    expect(
      await screen.findByText('This provider could not be reached. Showing the saved title.'),
    ).toBeInTheDocument();
  });

  it('removes a favorite from the list', async () => {
    const user = userEvent.setup();
    const { backend, session } = await signedInBackend();
    await backend.putContentState(session.sessionId, {
      providerId: ARCHIVE,
      itemId: ITEM.id,
      liked: false,
      favorited: true,
      explored: false,
      favoritedAt: '2026-10-26T00:00:00.000Z',
      snapshot: { title: ITEM.title, type: 'movie' },
    });

    renderAt('/favorites', backend);
    expect(await screen.findByRole('link', { name: ITEM.title })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: `Remove ${ITEM.title} from favorites` }));

    await waitFor(() => {
      expect(screen.queryByRole('link', { name: ITEM.title })).toBeNull();
    });
    expect(screen.getByText('Nothing saved yet')).toBeInTheDocument();
  });

  it('offers a resume link when book progress exists', async () => {
    const { backend, session } = await signedInBackend();
    await backend.putContentState(session.sessionId, {
      providerId: ARCHIVE,
      itemId: 'alice',
      liked: false,
      favorited: true,
      explored: true,
      favoritedAt: '2026-10-26T00:00:00.000Z',
      snapshot: { title: 'Alice in Wonderland', type: 'document' },
      progress: {
        kind: 'book',
        chapterId: 'c1',
        positionPercent: 20,
        updatedAt: '2026-10-26T01:00:00.000Z',
      },
    });

    renderAt('/favorites', backend);

    expect(await screen.findByRole('link', { name: 'Resume' })).toHaveAttribute(
      'href',
      `/viewer/${ARCHIVE}/alice`,
    );
  });

  it('offers a resume link when PDF progress exists', async () => {
    const { backend, session } = await signedInBackend();
    await backend.putContentState(session.sessionId, {
      providerId: ARCHIVE,
      itemId: ITEM.id,
      liked: false,
      favorited: true,
      explored: true,
      favoritedAt: '2026-10-26T00:00:00.000Z',
      snapshot: { title: ITEM.title, type: 'movie' },
      progress: { kind: 'pdf', page: 3, updatedAt: '2026-10-26T01:00:00.000Z' },
    });

    renderAt('/favorites', backend);

    expect(await screen.findByRole('link', { name: 'Resume' })).toHaveAttribute(
      'href',
      `/viewer/${ARCHIVE}/${ITEM.id}`,
    );
  });

  it('searches favorites from the URL', async () => {
    const { backend, session } = await signedInBackend();
    await backend.putContentState(session.sessionId, {
      providerId: ARCHIVE,
      itemId: ITEM.id,
      liked: false,
      favorited: true,
      explored: false,
      snapshot: { title: ITEM.title, type: 'movie' },
      favoritedAt: '2026-10-02T00:00:00.000Z',
    });
    await backend.putContentState(session.sessionId, {
      providerId: ARCHIVE,
      itemId: 'alice',
      liked: false,
      favorited: true,
      explored: false,
      snapshot: { title: 'Alice in Wonderland', type: 'document' },
      favoritedAt: '2026-10-03T00:00:00.000Z',
    });

    renderAt('/favorites?q=alice', backend);

    expect(await screen.findByRole('link', { name: 'Alice in Wonderland' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: ITEM.title })).toBeNull();
  });
});

describe('favorite and like controls', () => {
  it('favorites from item details without liking, and likes without favoriting', async () => {
    const user = userEvent.setup();
    const { backend, session } = await signedInBackend();
    renderAt(`/item/${ARCHIVE}/${ITEM.id}`, backend);

    expect(await screen.findByRole('heading', { level: 1, name: ITEM.title })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: `Add ${ITEM.title} to favorites` }));

    await waitFor(async () => {
      const stored = await backend.getContentState(session.sessionId, {
        providerId: ARCHIVE,
        itemId: ITEM.id,
      });
      expect(stored?.favorited).toBe(true);
      expect(stored?.liked).toBe(false);
      expect(stored?.snapshot?.title).toBe(ITEM.title);
    });

    await user.click(screen.getByRole('button', { name: `Like ${ITEM.title}` }));

    await waitFor(async () => {
      const stored = await backend.getContentState(session.sessionId, {
        providerId: ARCHIVE,
        itemId: ITEM.id,
      });
      expect(stored?.favorited).toBe(true);
      expect(stored?.liked).toBe(true);
    });
  });

  it('favorites from a collection page', async () => {
    const user = userEvent.setup();
    const { backend, session } = await signedInBackend();
    renderAt(`/collection/${ARCHIVE}/feature_films`, backend);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Feature Films' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: `Add ${ITEM.title} to favorites` }));

    await waitFor(async () => {
      const stored = await backend.getContentState(session.sessionId, {
        providerId: ARCHIVE,
        itemId: ITEM.id,
      });
      expect(stored?.favorited).toBe(true);
    });
  });

  it('favorites from a discovery card and shows the item on the favorites page', async () => {
    const user = userEvent.setup();
    const { backend, session } = await signedInBackend();
    const router = renderAt('/', backend);

    const add = await screen.findAllByRole('button', { name: 'Add Fresh movie to favorites' });
    await user.click(add[0]!);

    await waitFor(async () => {
      const stored = await backend.getContentState(session.sessionId, {
        providerId: ARCHIVE,
        itemId: 'search-movie',
      });
      expect(stored?.favorited).toBe(true);
    });

    await router.navigate('/favorites');
    expect(await screen.findByRole('link', { name: 'Fresh movie' })).toBeInTheDocument();
  });

  it('rolls a failed favorite write back to the previous state', async () => {
    const user = userEvent.setup();
    const { backend } = await signedInBackend();
    const originalPut = backend.putContentState.bind(backend);
    backend.putContentState = async (sessionId, state, options) => {
      if (state.favorited) {
        throw createPersistenceError('unavailable', 'The store could not be written.');
      }

      return originalPut(sessionId, state, options);
    };

    renderAt(`/item/${ARCHIVE}/${ITEM.id}`, backend);
    expect(await screen.findByRole('heading', { level: 1, name: ITEM.title })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: `Add ${ITEM.title} to favorites` }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be written/i);
    expect(screen.getByRole('button', { name: `Add ${ITEM.title} to favorites` })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});
