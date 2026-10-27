/**
 * Browsable Adult categories.
 *
 * These are Archive media types restricted to the adults-only collection. Category artwork
 * uses that collection's thumbnail rather than the unrestricted media-type cover, so a Movies
 * shelf on Adult cannot show a general-audience poster by accident.
 */

import type { ArchiveCategoryDefinition } from '../archive/catalog';

export const ADULT_CATEGORIES: readonly ArchiveCategoryDefinition[] = [
  {
    id: 'movies',
    name: 'Moving Images',
    description: 'Adult films and video filed in the Archive’s adults-only collections.',
    mediatype: 'movies',
    collectionId: 'movies',
  },
  {
    id: 'images',
    name: 'Images',
    description: 'Adult still images from the Archive’s adults-only collections.',
    mediatype: 'image',
    collectionId: 'image',
  },
  {
    id: 'texts',
    name: 'Texts',
    description: 'Adult texts from the Archive’s adults-only collections.',
    mediatype: 'texts',
    collectionId: 'texts',
  },
  {
    id: 'audio',
    name: 'Audio',
    description: 'Adult audio from the Archive’s adults-only collections.',
    mediatype: 'audio',
    collectionId: 'audio',
  },
];
