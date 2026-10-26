/**
 * Test-only provider fixtures.
 *
 * Not imported by application code. Since nothing in the app reaches this module, it is never
 * bundled; it exists so registry and gateway tests describe behaviour instead of repeating a
 * dozen stub methods.
 */

import type {
  ContentCategory,
  ContentCollection,
  ContentFile,
  ContentItem,
} from '../models/content';
import { createPaginatedResult } from '../models/pagination';
import {
  createProviderCapabilities,
  type ContentProvider,
  type ProviderCapabilities,
} from '../models/provider';

export function makeItem(overrides: Partial<ContentItem> = {}): ContentItem {
  return {
    id: 'item-1',
    providerId: 'fake',
    title: 'A test item',
    type: 'book',
    categories: [],
    tags: [],
    metadata: {},
    ...overrides,
  };
}

export function makeCollection(overrides: Partial<ContentCollection> = {}): ContentCollection {
  return {
    id: 'collection-1',
    providerId: 'fake',
    title: 'A test collection',
    categoryIds: [],
    metadata: {},
    ...overrides,
  };
}

export function makeCategory(overrides: Partial<ContentCategory> = {}): ContentCategory {
  return { id: 'category-1', name: 'A test category', ...overrides };
}

export function makeFile(overrides: Partial<ContentFile> = {}): ContentFile {
  return {
    id: 'file-1',
    providerId: 'fake',
    itemId: 'item-1',
    name: 'test.pdf',
    downloadAvailable: true,
    viewable: true,
    metadata: {},
    ...overrides,
  };
}

export interface FakeProviderOverrides extends Partial<ContentProvider> {
  readonly capabilities?: Partial<ProviderCapabilities>;
}

/**
 * A provider whose methods all succeed trivially and which advertises the full capability set,
 * so tests only have to state the capability they are actually exercising.
 *
 * `getAvailableFiles` and `getDownloadUrl` are intentionally *absent* unless overridden, so
 * tests can exercise the "optional method not implemented" path.
 */
export function createFakeProvider(overrides: FakeProviderOverrides = {}): ContentProvider {
  const { capabilities, ...methods } = overrides;
  const id = methods.id ?? 'fake';

  return {
    id,
    name: methods.name ?? `Fake ${id}`,
    version: methods.version ?? '1.0.0',
    getCapabilities: () =>
      createProviderCapabilities({
        search: true,
        categories: true,
        collections: true,
        itemDetails: true,
        relatedContent: true,
        downloadableFiles: true,
        pagination: true,
        ...capabilities,
      }),
    search: async () => createPaginatedResult([], { page: 1, pageSize: 24 }),
    getCategories: async () => [],
    getCollections: async () => createPaginatedResult([], { page: 1, pageSize: 24 }),
    getCollection: async () => makeCollection({ providerId: id }),
    getCollectionItems: async () => createPaginatedResult([], { page: 1, pageSize: 24 }),
    getItem: async (itemId) => makeItem({ id: itemId, providerId: id }),
    getRelatedItems: async () => [],
    ...methods,
  };
}
