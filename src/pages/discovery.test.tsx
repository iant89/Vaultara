/**
 * Discovery experience tests (roadmap Phase 5).
 *
 * These exercise the real pages against a stubbed provider, so they cover the wiring the route
 * smoke tests deliberately skip: which requests a page makes, how a row or grid handles failure,
 * and that paging, sorting, filtering, and searching all travel through the URL.
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { createRoutes } from '../app/routes';
import { DISCOVERY_ROWS, PRIMARY_PROVIDER_ID } from '../config/discovery';
import { ProviderServicesProvider, type ProviderServices } from '../data/ProviderServices';
import { createContentQueries } from '../data/contentQueries';
import { createAppError } from '../models/errors';
import type { ContentCategory, ContentItem } from '../models/content';
import { createPaginatedResult } from '../models/pagination';
import { ProviderGateway } from '../providers/gateway';
import { ProviderRegistry } from '../providers/registry';
import {
  createFakeProvider,
  makeCategory,
  makeCollection,
  makeFile,
  makeItem,
} from '../test/fakeProvider';

const ARCHIVE = PRIMARY_PROVIDER_ID;

const CATEGORIES: readonly ContentCategory[] = [
  makeCategory({
    id: 'movies',
    name: 'Moving Images',
    description: 'Films and footage.',
    providerId: ARCHIVE,
  }),
  makeCategory({
    id: 'texts',
    name: 'Texts',
    description: 'Scanned documents.',
    providerId: ARCHIVE,
  }),
];

const ITEM: ContentItem = makeItem({
  id: 'night_of_the_living_dead',
  providerId: ARCHIVE,
  title: 'Night of the Living Dead',
  type: 'movie',
  description: 'A night in rural Pennsylvania.\n\nGeorge Romero’s debut feature.',
  creator: 'George A. Romero',
  publicationDate: '1968-10-01',
  categories: ['feature_films'],
  tags: ['horror', 'public domain'],
  thumbnailUrl: 'https://archive.org/services/img/night_of_the_living_dead',
  sourceUrl: 'https://archive.org/details/night_of_the_living_dead',
  rights: {
    license: 'https://creativecommons.org/publicdomain/mark/1.0/',
    rightsStatement: 'Public domain.',
    attributionUrl: 'https://archive.org/details/night_of_the_living_dead',
  },
});

function createHarness() {
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

  const getCollections = vi.fn(
    async (categoryId: string, options?: { page?: number; pageSize?: number }) => {
      if (!CATEGORIES.some((category) => category.id === categoryId)) {
        throw createAppError('not-found', `The category ${categoryId} does not exist.`);
      }

      const page = options?.page ?? 1;
      const pageSize = options?.pageSize ?? 24;

      return createPaginatedResult(
        [
          makeCollection({
            id: 'feature_films',
            providerId: ARCHIVE,
            title: 'Feature Films',
            description: 'Feature-length films.',
            itemCount: 4_210,
            categoryIds: [categoryId],
          }),
          makeCollection({
            id: 'classic_tv',
            providerId: ARCHIVE,
            title: 'Classic TV',
            categoryIds: [categoryId],
          }),
        ],
        { page, pageSize, total: 40 },
      );
    },
  );

  const getSubcollections = vi.fn(async (_collectionId: string, options?: { page?: number }) => {
    const page = options?.page ?? 1;

    return createPaginatedResult(
      page === 1
        ? [
            makeCollection({
              id: 'dos_games',
              providerId: ARCHIVE,
              title: 'DOS Games',
              description: 'Games written for MS-DOS.',
              categoryIds: ['movies'],
            }),
          ]
        : [
            makeCollection({
              id: 'windows_apps',
              providerId: ARCHIVE,
              title: 'Windows Applications',
              categoryIds: ['movies'],
            }),
          ],
      { page, pageSize: 6, total: 8 },
    );
  });

  const getCollection = vi.fn(async (collectionId: string) =>
    collectionId === ITEM.id
      ? makeCollection({
          id: collectionId,
          providerId: ARCHIVE,
          title: ITEM.title,
          metadata: { mediatype: 'movies', is_collection: false },
        })
      : makeCollection({
          id: collectionId,
          providerId: ARCHIVE,
          title: 'Feature Films',
          description: 'Feature-length films from the Archive.',
          itemCount: 4_210,
          categoryIds: ['movies'],
          sourceUrl: `https://archive.org/details/${collectionId}`,
          metadata: { mediatype: 'collection', is_collection: true },
        }),
  );

  const getCollectionItems = vi.fn(
    async (collectionId: string, options?: { page?: number; sort?: string; query?: string }) => {
      const page = options?.page ?? 1;

      if (collectionId === 'dos_games') {
        return createPaginatedResult(
          [makeItem({ id: 'doom', providerId: ARCHIVE, title: 'Doom', type: 'game' })],
          { page, pageSize: 24, total: 12 },
        );
      }

      if (collectionId === 'windows_apps') {
        return createPaginatedResult(
          [makeItem({ id: 'notepad', providerId: ARCHIVE, title: 'Notepad', type: 'software' })],
          { page, pageSize: 24, total: 4 },
        );
      }

      if (collectionId === 'classic_tv') {
        return createPaginatedResult(
          [
            makeItem({
              id: 'twilight-zone',
              providerId: ARCHIVE,
              title: 'The Twilight Zone',
              type: 'video',
            }),
          ],
          { page, pageSize: 24, total: 20 },
        );
      }

      return createPaginatedResult(
        page === 1
          ? [ITEM, makeItem({ id: 'second', providerId: ARCHIVE, title: 'Second film' })]
          : [makeItem({ id: 'third', providerId: ARCHIVE, title: 'Third film' })],
        { page, pageSize: 24, total: 30 },
      );
    },
  );

  const getItem = vi.fn(async (itemId: string) =>
    itemId === 'SciFi_Horror'
      ? makeItem({
          id: 'SciFi_Horror',
          providerId: ARCHIVE,
          title: 'Sci-Fi / Horror',
          type: 'collection',
          categories: ['feature_films'],
        })
      : ITEM,
  );
  const getRelatedItems = vi.fn(async (_itemId: string, options?: { page?: number }) => {
    const page = options?.page ?? 1;

    return createPaginatedResult(
      [
        page === 1
          ? makeItem({ id: 'related', providerId: ARCHIVE, title: 'A related film', type: 'movie' })
          : makeItem({
              id: 'related-2',
              providerId: ARCHIVE,
              title: 'Another film',
              type: 'movie',
            }),
      ],
      { page, pageSize: 12, total: 30 },
    );
  });
  const getAvailableFiles = vi.fn(async () => [
    makeFile({
      id: 'night_of_the_living_dead.mp4',
      providerId: ARCHIVE,
      itemId: ITEM.id,
      name: 'night_of_the_living_dead.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 1_048_576,
      downloadAvailable: true,
      downloadUrl: `https://archive.org/download/${ITEM.id}/night_of_the_living_dead.mp4`,
    }),
  ]);
  const getCategories = vi.fn(async () => CATEGORIES);

  const registry = new ProviderRegistry();
  registry.register(
    createFakeProvider({
      id: ARCHIVE,
      name: 'Internet Archive',
      capabilities: {
        contentTypes: ['document', 'movie', 'audio', 'music', 'image', 'software', 'website'],
      },
      search,
      getCategories,
      getCollections,
      getCollection,
      getCollectionItems,
      getSubcollections,
      getItem,
      getRelatedItems,
      getAvailableFiles,
    }),
  );

  const gateway = new ProviderGateway(registry, {
    retry: { maxAttempts: 1, baseDelayMs: 1, maxDelayMs: 1, jitterRatio: 0 },
    sleep: () => Promise.resolve(),
  });

  const services: ProviderServices = {
    runtime: { registry, gateway },
    queries: createContentQueries(gateway),
  };

  return {
    services,
    spies: {
      search,
      getCollections,
      getCollection,
      getCollectionItems,
      getSubcollections,
      getItem,
      getRelatedItems,
    },
  };
}

function renderAt(path: string, services: ProviderServices) {
  const router = createMemoryRouter(createRoutes(), { initialEntries: [path] });

  render(
    <ProviderServicesProvider services={services}>
      <RouterProvider router={router} />
    </ProviderServicesProvider>,
  );

  return router;
}

describe('discovery home page', () => {
  it('renders one row per discovery row and promotes the featured item', async () => {
    const { services, spies } = createHarness();
    renderAt('/', services);

    expect(screen.getByRole('heading', { level: 1, name: 'Discovery' })).toBeInTheDocument();

    const featured = await screen.findByRole('article');

    expect(within(featured).getByText('Featured')).toBeInTheDocument();
    expect(within(featured).getAllByRole('link')[0]).toHaveAttribute(
      'href',
      `/item/${ARCHIVE}/search-movie`,
    );

    for (const row of DISCOVERY_ROWS) {
      expect(screen.getByRole('heading', { level: 2, name: row.title })).toBeInTheDocument();
    }

    // Six rows, six requests: the featured slot shares the movies row's cache entry rather than
    // issuing a request of its own (roadmap 5.5, no duplicate requests).
    expect(spies.search).toHaveBeenCalledTimes(DISCOVERY_ROWS.length);
  });

  it('links each row to a category the provider actually reports', async () => {
    const { services } = createHarness();
    renderAt('/', services);

    await screen.findAllByText('Fresh movie');

    const films = screen.getByRole('heading', { level: 2, name: 'Films' }).closest('section');

    expect(films).not.toBeNull();
    expect(within(films as HTMLElement).getByRole('link', { name: /view all/i })).toHaveAttribute(
      'href',
      '/category/movies',
    );

    // 'software' and 'web' are not in this provider's category list, so no dead links appear.
    await screen.findByRole('link', { name: /Moving Images/ });
    // Rows without a matching category keep a plain heading and no "View all" link.
    expect(document.querySelector('a[href="/category/software"]')).toBeNull();
    expect(document.querySelector('a[href="/category/web"]')).toBeNull();
  });

  it('shows a row failure in place and keeps the rest of the page usable', async () => {
    const { services } = createHarness();
    services.runtime.gateway.search = async () => {
      throw createAppError('network', 'The network request failed.');
    };

    renderAt('/', services);

    // Every row fails independently and says so; the page itself stays intact.
    expect(await screen.findAllByText('This row could not be loaded')).toHaveLength(
      DISCOVERY_ROWS.length,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Discovery' })).toBeInTheDocument();
  });

  it('states that personalisation is not implemented', () => {
    const { services } = createHarness();
    renderAt('/', services);

    expect(screen.getByText('Personal recommendations is not available yet')).toBeInTheDocument();
  });
});

describe('category page', () => {
  it('lists the category collections as rows of their items', async () => {
    const { services } = createHarness();
    renderAt('/category/movies', services);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Moving Images' }),
    ).toBeInTheDocument();

    expect(await screen.findByText('Night of the Living Dead')).toBeInTheDocument();
    expect(await screen.findByText('The Twilight Zone')).toBeInTheDocument();

    const heading = screen.getByRole('heading', { level: 2, name: 'Feature Films' });
    const shelf = heading.closest('section');

    expect(shelf).not.toBeNull();
    expect(
      within(shelf as HTMLElement).getByRole('link', { name: 'Feature Films' }),
    ).toHaveAttribute('href', `/collection/${ARCHIVE}/feature_films`);
    expect(within(shelf as HTMLElement).getByRole('link', { name: /view all/i })).toHaveAttribute(
      'href',
      `/collection/${ARCHIVE}/feature_films`,
    );
    expect(screen.getByText('4,210 items')).toBeInTheDocument();
    expect(screen.getAllByText('Internet Archive').length).toBeGreaterThan(0);
  });

  it('reports a category the provider does not have', async () => {
    const { services } = createHarness();
    renderAt('/category/not-a-category', services);

    expect(await screen.findByText('Category not found')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Category' })).toBeInTheDocument();
  });

  it('pages through collections with numbered links', async () => {
    const { services } = createHarness();
    renderAt('/category/movies', services);

    const next = await screen.findByRole('link', { name: /Next/ });

    expect(next).toHaveAttribute('href', '/category/movies?page=2');

    // The provider reported 40 collections at 6 shelves per page, so there are seven pages of them.
    expect(screen.getByText('Page 1 of 7')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '2' })).toHaveAttribute(
      'href',
      '/category/movies?page=2',
    );
  });
});

describe('collection page', () => {
  it('shows the collection header, items, and provider source', async () => {
    const { services } = createHarness();
    renderAt(`/collection/${ARCHIVE}/feature_films`, services);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Feature Films' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Night of the Living Dead')).toBeInTheDocument();
    expect(screen.getByText('4,210 items')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View on Internet Archive' })).toHaveAttribute(
      'href',
      `https://archive.org/details/feature_films`,
    );
    // Favourites do not exist yet, so no card offers a favourite control.
    expect(screen.queryByRole('button', { name: /favourite/i })).toBeNull();
  });

  it('sends sorting, filtering, and in-collection search through the URL', async () => {
    const { services, spies } = createHarness();
    const router = renderAt(`/collection/${ARCHIVE}/feature_films`, services);

    await screen.findByRole('heading', { level: 1, name: 'Feature Films' });

    await userEvent.selectOptions(screen.getByLabelText('Sort by'), 'Recently added');
    expect(router.state.location.search).toContain('sort=added-desc');

    await userEvent.selectOptions(screen.getByLabelText('Content type'), 'movie');
    expect(router.state.location.search).toContain('type=movie');

    await userEvent.type(screen.getByLabelText('Search this collection'), 'romero');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(router.state.location.search).toContain('q=romero');
    // Changing anything other than the page returns to page one, so a narrowed view is never
    // requested from the middle of the result set.
    expect(router.state.location.search).not.toContain('page=');

    const lastCall = spies.getCollectionItems.mock.calls.at(-1);
    expect(lastCall?.[1]).toMatchObject({
      sort: 'added-desc',
      contentTypes: ['movie'],
      query: 'romero',
    });
  });

  it('adds the next batch of items when the reader asks for more', async () => {
    const { services } = createHarness();
    renderAt(`/collection/${ARCHIVE}/feature_films`, services);

    expect(await screen.findByText('Night of the Living Dead')).toBeInTheDocument();
    expect(screen.getByText('Showing 2 of 30 items')).toBeInTheDocument();
    expect(screen.queryByText('Third film')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'View more items' }));

    // Appended, not replaced: the existing entries stay on screen while the next batch arrives.
    expect(await screen.findByText('Third film')).toBeInTheDocument();
    expect(screen.getByText('Night of the Living Dead')).toBeInTheDocument();
    expect(screen.getByText('Showing 3 of 30 items')).toBeInTheDocument();
  });

  it('shows the collections nested inside a collection and adds more on request', async () => {
    const { services, spies } = createHarness();
    renderAt(`/collection/${ARCHIVE}/softwarelibrary`, services);

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Collections inside' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /DOS Games/ })).toHaveAttribute(
      'href',
      `/collection/${ARCHIVE}/dos_games`,
    );
    expect(await screen.findByText('Doom')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'View more nested collections' }));

    // Wait for the appended shelf's items, not just its heading: the heading link remounts
    // when the row leaves the loading state, and asserting it the instant it appears can
    // catch a node that React has already replaced.
    expect(await screen.findByText('Notepad')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Windows Applications/ })).toHaveAttribute(
      'href',
      `/collection/${ARCHIVE}/windows_apps`,
    );
    expect(spies.getSubcollections).toHaveBeenCalledTimes(2);
    expect(spies.getSubcollections.mock.calls.at(-1)?.[1]).toMatchObject({ page: 2 });
  });

  it('offers related collections from the same category', async () => {
    const { services } = createHarness();
    renderAt(`/collection/${ARCHIVE}/feature_films`, services);

    expect(
      await screen.findByRole('heading', { level: 2, name: 'More in Moving Images' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Classic TV/ })).toHaveAttribute(
      'href',
      `/collection/${ARCHIVE}/classic_tv`,
    );
  });
});

describe('item page', () => {
  it('renders the item hero, description, files, metadata, and attribution', async () => {
    const { services } = createHarness();
    renderAt(`/item/${ARCHIVE}/night_of_the_living_dead`, services);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Night of the Living Dead' }),
    ).toBeInTheDocument();

    expect(screen.getByText('A night in rural Pennsylvania.')).toBeInTheDocument();
    expect(screen.getAllByText('George A. Romero').length).toBeGreaterThan(0);
    expect(screen.getByText('archive:night_of_the_living_dead')).toBeInTheDocument();

    const filesSection = await screen.findByRole('heading', { level: 2, name: 'Files' });

    const download = within(filesSection.closest('section') as HTMLElement).getByRole('link');

    expect(download).toHaveAttribute(
      'href',
      `https://archive.org/download/night_of_the_living_dead/night_of_the_living_dead.mp4`,
    );

    expect(
      screen.getByRole('link', { name: /View this item on Internet Archive/ }),
    ).toHaveAttribute('href', 'https://archive.org/details/night_of_the_living_dead');
    expect(screen.getByText('Public domain.')).toBeInTheDocument();
  });

  it('shows related content from the same provider and can add more', async () => {
    const { services, spies } = createHarness();
    renderAt(`/item/${ARCHIVE}/night_of_the_living_dead`, services);

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Related items' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('A related film')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'View more related items' }));

    expect(await screen.findByText('Another film')).toBeInTheDocument();
    expect(screen.getByText('A related film')).toBeInTheDocument();
    expect(spies.getRelatedItems.mock.calls.at(-1)?.[1]).toMatchObject({ page: 2 });
  });

  it('sends a collection opened as an item to the collection page', async () => {
    const { services } = createHarness();
    const router = renderAt(`/item/${ARCHIVE}/SciFi_Horror`, services);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/collection/${ARCHIVE}/SciFi_Horror`);
    });
  });

  it('sends an item opened as a collection to the item page', async () => {
    const { services } = createHarness();
    const router = renderAt(`/collection/${ARCHIVE}/${ITEM.id}`, services);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/item/${ARCHIVE}/${ITEM.id}`);
    });
  });

  it('says when an item does not exist instead of blaming the network', async () => {
    const { services } = createHarness();
    services.runtime.gateway.getItem = async () => {
      throw createAppError('not-found', 'The item does not exist.');
    };

    renderAt(`/item/${ARCHIVE}/missing-item`, services);

    expect(await screen.findByText('Item not found')).toBeInTheDocument();
  });
});
