/**
 * Browsable Archive media types.
 *
 * The Archive's catalogue is a tree, not a list: a media type (Software, Moving Images, Texts…)
 * contains collections, a collection may contain further subcollections, and items sit at the
 * leaves. The Archive exposes no endpoint that returns that tree, so this module declares the
 * media types and the collection identifier each one is rooted at. Everything below the media
 * type is discovered from the search index at request time — a collection that is added,
 * renamed, or emptied on the Archive appears or disappears on its own.
 *
 * The names and descriptions here are ours. They are presentation copy for the six media types
 * the application offers, not claims about remote state.
 */

export interface ArchiveCategoryDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Archive `mediatype` this category is built from. */
  readonly mediatype: string;
  /**
   * The collection the media type is rooted at. Collections filed under it are the category's
   * browsable collections.
   *
   * The Archive flattens ancestry into every item's `collection` field (parent collections are
   * added automatically, up to and including the media type), which is what makes
   * `mediatype:collection AND collection:<id>` a complete list of the collections beneath a node.
   */
  readonly collectionId: string;
}

export const ARCHIVE_CATEGORIES: readonly ArchiveCategoryDefinition[] = [
  {
    id: 'movies',
    name: 'Moving Images',
    description:
      'Feature films, television, advertising, and amateur footage, much of it in the public domain.',
    mediatype: 'movies',
    collectionId: 'movies',
  },
  {
    id: 'texts',
    name: 'Texts',
    description:
      'Scanned books, government reports, magazines, and historical documents from the Archive’s text collections.',
    mediatype: 'texts',
    collectionId: 'texts',
  },
  {
    id: 'audio',
    name: 'Audio',
    description: 'Live recordings, radio, audiobooks, poetry readings, and historical sound.',
    mediatype: 'audio',
    collectionId: 'audio',
  },
  {
    id: 'images',
    name: 'Images',
    description: 'Museum and institutional image collections, posters, maps, and photographs.',
    mediatype: 'image',
    collectionId: 'image',
  },
  {
    id: 'software',
    name: 'Software',
    description:
      'Historic software, emulated systems, and application archives, filed collection by collection.',
    mediatype: 'software',
    collectionId: 'software',
  },
  {
    id: 'data',
    name: 'Data',
    description: 'Datasets, research corpora, and machine-readable material.',
    mediatype: 'data',
    collectionId: 'data',
  },
  {
    id: 'web',
    name: 'Web Archive',
    description: 'Captured websites preserved as part of the Archive’s web collections.',
    mediatype: 'web',
    collectionId: 'web',
  },
];

export function findArchiveCategory(categoryId: string): ArchiveCategoryDefinition | undefined {
  const normalized = categoryId.trim().toLowerCase();

  return ARCHIVE_CATEGORIES.find((category) => category.id === normalized);
}

/**
 * Media types whose collection identifier a metadata record may carry, most specific first.
 *
 * Used to place a collection in the interface's categories: the Archive lists every ancestor in
 * an item's `collection` field, so the presence of `software` there is what makes a nested
 * subcollection still browsable under the Software category.
 */
export function findArchiveCategoryByCollection(
  collectionId: string,
): ArchiveCategoryDefinition | undefined {
  const normalized = collectionId.trim().toLowerCase();

  return ARCHIVE_CATEGORIES.find((category) => category.collectionId === normalized);
}

/**
 * Whether a collection document is a direct child of `parentId`.
 *
 * The Archive copies every ancestor into `collection`, so `collection:movies` matches Feature
 * Films and also Sci-Fi / Horror nested inside it. That tree is too large to curate. A direct
 * child lists the parent and only the parent's own ancestors (media types included); an
 * intermediate collection in the field means the document belongs one level further down.
 *
 * A missing `collection` field is treated as direct: the search already scoped to this parent,
 * and some records omit ancestry in the returned fields.
 */
export function isDirectChildCollection(
  parentId: string,
  listedParents: readonly string[],
  options: {
    readonly childId?: string;
    readonly parentAncestors?: readonly string[];
  } = {},
): boolean {
  const parent = parentId.trim().toLowerCase();

  if (parent === '') {
    return false;
  }

  const childId = options.childId?.trim().toLowerCase() ?? '';
  const allowed = new Set<string>([parent]);

  for (const ancestor of options.parentAncestors ?? []) {
    const normalized = ancestor.trim().toLowerCase();

    if (normalized !== '') {
      allowed.add(normalized);
    }
  }

  for (const category of ARCHIVE_CATEGORIES) {
    allowed.add(category.collectionId);
  }

  const listed = listedParents
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry !== '' && entry !== childId);

  if (listed.length === 0) {
    return true;
  }

  return listed.every((entry) => allowed.has(entry));
}
