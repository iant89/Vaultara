/**
 * Discovery presentation configuration (design spec 5.1, 5.2).
 *
 * Which rows the home page shows, and in what order, is a product decision rather than provider
 * knowledge: rows are expressed in the shared content-type vocabulary, so a second provider
 * serving films can fill the same row. `categoryId` is only a link target — it is resolved against
 * the categories the provider actually reports, and the "View all" link is dropped when the
 * provider has no such category, so a provider swap cannot produce a dead link.
 */

import type { ContentType } from '../models/content';

/** The provider the discovery surfaces read from. */
export const PRIMARY_PROVIDER_ID = 'archive';

/** Rows ask for this many items; design spec 5.2 targets 20-30 per row. */
export const ROW_PAGE_SIZE = 24;

export interface DiscoveryRowDefinition {
  /** Category the row's "View all" link points at. */
  readonly categoryId: string;
  readonly title: string;
  readonly description: string;
  readonly contentTypes: readonly ContentType[];
}

/** The row whose newest item is promoted to the featured slot. */
export const FEATURED_CATEGORY_ID = 'movies';

export const DISCOVERY_ROWS: readonly DiscoveryRowDefinition[] = [
  {
    categoryId: 'movies',
    title: 'Films',
    description: 'Feature films, television, and amateur footage, much of it in the public domain.',
    contentTypes: ['movie', 'video'],
  },
  {
    categoryId: 'texts',
    title: 'Books and documents',
    description: 'Scanned books, reports, magazines, and historical documents.',
    contentTypes: ['book', 'document', 'article'],
  },
  {
    categoryId: 'audio',
    title: 'Audio',
    description: 'Live recordings, radio, audiobooks, and historical sound.',
    contentTypes: ['audio', 'music'],
  },
  {
    categoryId: 'images',
    title: 'Images',
    description: 'Museum collections, posters, maps, and photographs.',
    contentTypes: ['image'],
  },
  {
    categoryId: 'software',
    title: 'Software',
    description: 'Historic software, emulated systems, and application archives.',
    contentTypes: ['software'],
  },
  {
    categoryId: 'web',
    title: 'Web archive',
    description: 'Captured websites preserved as part of a web archive.',
    contentTypes: ['website'],
  },
];
