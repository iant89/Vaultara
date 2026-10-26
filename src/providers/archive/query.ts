/**
 * Query construction for the Archive's advanced search.
 *
 * The search endpoint accepts Solr-style Lucene syntax. User text is escaped so that characters
 * with meaning in that syntax (a colon in "Re: construction", a bracket in a title) are treated as
 * text rather than changing the query. That stops a search box entry from becoming an arbitrary
 * field query or breaking out of a filter; the boolean words `AND`/`OR`/`NOT` remain operators,
 * which affects only the user's own search.
 */

import type { ContentType } from '../../models/content';
import type { SearchSort } from '../../models/provider';

/**
 * Characters that alter Lucene parsing. `&` and `|` are included because doubled they form the
 * `&&` / `||` operators.
 */
const LUCENE_SPECIAL_CHARACTERS: ReadonlySet<string> = new Set([
  '+',
  '-',
  '!',
  '(',
  ')',
  '{',
  '}',
  '[',
  ']',
  '^',
  '"',
  '~',
  '*',
  '?',
  ':',
  '\\',
  '/',
  '&',
  '|',
]);

export function escapeLucene(value: string): string {
  let escaped = '';

  for (const character of value) {
    escaped += LUCENE_SPECIAL_CHARACTERS.has(character) ? `\\${character}` : character;
  }

  return escaped;
}

/** Shared content types → Archive mediatypes, for the `mediatype:` clause. */
const CONTENT_TYPE_MEDIATYPES: Readonly<Record<ContentType, readonly string[]>> = {
  book: ['texts'],
  document: ['texts'],
  article: ['texts'],
  movie: ['movies'],
  video: ['movies'],
  audio: ['audio', 'etree'],
  music: ['audio', 'etree'],
  image: ['image'],
  game: [],
  software: ['software', 'data'],
  website: ['web'],
  collection: ['collection'],
  archive: [],
  unknown: [],
};

/** Build a `mediatype:` clause for the requested content types, or `undefined` for no filter. */
export function buildMediatypeClause(
  contentTypes: readonly ContentType[] | undefined,
): string | undefined {
  if (contentTypes === undefined || contentTypes.length === 0) {
    return undefined;
  }

  const mediatypes = new Set<string>();

  for (const contentType of contentTypes) {
    for (const mediatype of CONTENT_TYPE_MEDIATYPES[contentType]) {
      mediatypes.add(mediatype);
    }
  }

  if (mediatypes.size === 0) {
    return undefined;
  }

  const terms = [...mediatypes].map((mediatype) => escapeLucene(mediatype)).join(' OR ');

  return `mediatype:(${terms})`;
}

/**
 * Combine escaped user text with filter clauses.
 *
 * The text is parenthesized whenever a filter is present. Without that, a query containing an
 * `OR` would bind looser than the `AND`, so `a OR b AND mediatype:(texts)` would return `a`
 * regardless of type — a user could slip past the filter just by typing an operator.
 */
export function buildQuery(text: string, clauses: readonly (string | undefined)[] = []): string {
  const filters = clauses.filter(
    (clause): clause is string => clause !== undefined && clause.length > 0,
  );
  const trimmed = text.trim();
  const parts: string[] = [];

  if (trimmed.length > 0) {
    parts.push(filters.length > 0 ? `(${trimmed})` : trimmed);
  }

  parts.push(...filters);

  return parts.join(' AND ');
}

/** Shared sort options → Archive `sort[]` expressions. Relevance means "omit", Archive default. */
const SORT_EXPRESSIONS: Readonly<Record<SearchSort, string | undefined>> = {
  relevance: undefined,
  'date-desc': 'date desc',
  'date-asc': 'date asc',
  // `publicdate` is when the item was added to the Archive, which is what "recently added" means
  // to a reader; an item's own `date` is often years older.
  'added-desc': 'publicdate desc',
  'title-asc': 'titleSorter asc',
};

export function mapSort(sort: SearchSort | undefined): string | undefined {
  return sort === undefined ? undefined : SORT_EXPRESSIONS[sort];
}

/**
 * Selects containers rather than content.
 *
 * A collection is itself an item, distinguished only by its mediatype. Asking for
 * `mediatype:collection` within a collection's scope is how the Archive's own pages list the
 * collections inside one.
 */
export const COLLECTION_MEDIATYPE_CLAUSE = 'mediatype:collection';

/**
 * Removes collections from a result set.
 *
 * Every item's `collection` field lists its ancestors up to the media type, and a collection is an
 * item too — so `collection:<id>` alone returns subcollections alongside the items they group.
 * This clause is what keeps an item grid to items.
 */
export const EXCLUDE_COLLECTIONS_CLAUSE = '-mediatype:collection';

/** `collection:<id>` filter, escaped. */
export function buildCollectionClause(collectionId: string): string {
  return `collection:${escapeLucene(collectionId.trim())}`;
}

/** `identifier:(a OR b)` lookup used to fetch several known items in one request. */
export function buildIdentifierClause(identifiers: readonly string[]): string {
  const terms = identifiers.map((identifier) => escapeLucene(identifier)).join(' OR ');

  return `identifier:(${terms})`;
}
