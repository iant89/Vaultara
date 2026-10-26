/**
 * URL parameter handling for browsable content.
 *
 * Paging, ordering, filtering, and in-collection search all live in the query string so a view can
 * be linked, bookmarked, reloaded, and reached with the browser's back button. Parsing is total:
 * an unrecognized value falls back to the default rather than throwing, because these parameters
 * arrive from links the application did not create.
 */

import { isContentType, type ContentType } from '../models/content';
import type { SearchSort } from '../models/provider';

/** Orderings a collection page offers. The empty value keeps the provider's own default order. */
export const COLLECTION_SORT_OPTIONS: readonly { value: string; label: string }[] = [
  { value: '', label: 'Most downloaded' },
  { value: 'added-desc', label: 'Recently added' },
  { value: 'date-desc', label: 'Newest by date' },
  { value: 'date-asc', label: 'Oldest first' },
  { value: 'title-asc', label: 'Title A–Z' },
];

const SORT_VALUES: ReadonlySet<string> = new Set(
  COLLECTION_SORT_OPTIONS.map((option) => option.value).filter((value) => value !== ''),
);

export function parsePageParam(value: string | null): number {
  if (value === null || value.trim() === '') {
    return 1;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function parseSortParam(value: string | null): SearchSort | undefined {
  return value !== null && SORT_VALUES.has(value) ? (value as SearchSort) : undefined;
}

export function parseContentTypeParam(value: string | null): ContentType | undefined {
  return value !== null && isContentType(value) ? value : undefined;
}

/**
 * A new query string with the given changes applied.
 *
 * Changing anything other than the page itself returns to page one: staying on page four after
 * narrowing a filter usually lands the reader on an empty grid.
 */
export function nextSearchParams(
  current: URLSearchParams,
  changes: Readonly<Record<string, string | undefined>>,
): URLSearchParams {
  const next = new URLSearchParams(current);
  const keepsPage = Object.keys(changes).every((key) => key === 'page');

  if (!keepsPage) {
    next.delete('page');
  }

  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined || value.trim() === '') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
  }

  return next;
}

/** `/collection/archive/x?page=2`, or a bare path when there is nothing to add. */
export function withSearchParams(path: string, params: URLSearchParams): string {
  const query = params.toString();

  return query.length === 0 ? path : `${path}?${query}`;
}
