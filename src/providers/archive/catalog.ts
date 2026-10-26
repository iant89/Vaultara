/**
 * Browsable Archive categories.
 *
 * The Archive has no category endpoint: an item's `mediatype` is the closest thing to a top-level
 * category, and collections are the layer beneath it. This module therefore holds a curated
 * catalogue — mediatype plus the well-known collections inside it — which design spec 7.1 treats
 * as provider configuration rather than core logic.
 *
 * Collection titles come from the Archive whenever the catalogue entry resolves; the names here
 * are fallbacks for navigation, not claims about remote state. An entry that no longer exists on
 * the Archive still produces a working link rather than a dead row in the interface.
 */

export interface ArchiveCollectionDefinition {
  readonly id: string;
  readonly name: string;
}

export interface ArchiveCategoryDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Archive `mediatype` this category is built from. */
  readonly mediatype: string;
  readonly collections: readonly ArchiveCollectionDefinition[];
}

export const ARCHIVE_CATEGORIES: readonly ArchiveCategoryDefinition[] = [
  {
    id: 'texts',
    name: 'Texts',
    description:
      'Scanned books, government reports, magazines, and historical documents from the Archive’s text collections.',
    mediatype: 'texts',
    collections: [
      { id: 'gutenberg', name: 'Project Gutenberg' },
      { id: 'opensource', name: 'Community Texts' },
      { id: 'americana', name: 'American Libraries' },
      { id: 'universallibrary', name: 'Universal Library' },
      { id: 'magazine_rack', name: 'The Magazine Rack' },
    ],
  },
  {
    id: 'movies',
    name: 'Moving Images',
    description:
      'Feature films, television, advertising, and amateur footage, much of it in the public domain.',
    mediatype: 'movies',
    collections: [
      { id: 'feature_films', name: 'Feature Films' },
      { id: 'classic_tv', name: 'Classic TV' },
      { id: 'prelinger', name: 'Prelinger Archives' },
      { id: 'moviesandfilms', name: 'Movies and Films' },
    ],
  },
  {
    id: 'audio',
    name: 'Audio',
    description: 'Live recordings, radio, audiobooks, poetry readings, and historical sound.',
    mediatype: 'audio',
    collections: [
      { id: 'audio_music', name: 'Music' },
      { id: 'etree', name: 'Live Music Archive' },
      { id: 'audio_bookspoetry', name: 'Audiobooks and Poetry' },
      { id: 'oldtimeradio', name: 'Old Time Radio' },
      { id: 'georgeblood', name: '78 RPMs and Cylinder Recordings' },
    ],
  },
  {
    id: 'images',
    name: 'Images',
    description: 'Museum and institutional image collections, posters, maps, and photographs.',
    mediatype: 'image',
    collections: [
      { id: 'metropolitanmuseumofart', name: 'Metropolitan Museum of Art' },
      { id: 'smithsonian', name: 'Smithsonian Institution' },
      { id: 'nasa', name: 'NASA Images' },
    ],
  },
  {
    id: 'software',
    name: 'Software',
    description: 'Historic software, emulated systems, and application archives.',
    mediatype: 'software',
    collections: [
      { id: 'softwarelibrary', name: 'Software Library' },
      { id: 'softwarelibrary_msdos', name: 'Software Library: MS-DOS Games' },
      { id: 'softwarelibrary_apple', name: 'Software Library: Apple' },
      { id: 'classicpcgames', name: 'Classic PC Games' },
    ],
  },
  {
    id: 'web',
    name: 'Web Archive',
    description: 'Captured websites preserved as part of the Archive’s web collections.',
    mediatype: 'web',
    collections: [{ id: 'web', name: 'Web Crawls' }],
  },
];

export function findArchiveCategory(categoryId: string): ArchiveCategoryDefinition | undefined {
  const normalized = categoryId.trim().toLowerCase();

  return ARCHIVE_CATEGORIES.find((category) => category.id === normalized);
}
