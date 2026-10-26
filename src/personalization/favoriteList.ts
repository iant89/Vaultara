/**
 * Local favorites-page query (design spec 14.3).
 *
 * Filtering and search run against stored snapshots so an unreachable provider cannot blank
 * the list. Live item fetches may refine artwork; they must not be required to sort or filter.
 */

import type { ContentType } from '../models/content';
import type { UserContentState } from '../models/userState';
import { isFavoriteRecord } from './savedContent';

export type FavoriteSort = 'favorited-desc' | 'title-asc';

export const FAVORITE_SORT_OPTIONS: readonly { value: FavoriteSort; label: string }[] = [
  { value: 'favorited-desc', label: 'Recently saved' },
  { value: 'title-asc', label: 'Title A–Z' },
];

export interface FavoriteListQuery {
  readonly query?: string;
  readonly providerId?: string;
  readonly contentType?: ContentType;
  readonly sort?: FavoriteSort;
}

export function favoriteTitle(state: UserContentState): string {
  return state.snapshot?.title ?? state.itemId;
}

export function favoriteType(state: UserContentState): ContentType {
  return state.snapshot?.type ?? 'unknown';
}

export function listFavorites<T extends UserContentState>(
  states: readonly T[],
  query: FavoriteListQuery = {},
): readonly T[] {
  const needle = query.query?.trim().toLowerCase() ?? '';

  const filtered = states.filter((state) => {
    if (!isFavoriteRecord(state)) {
      return false;
    }

    if (query.providerId !== undefined && state.providerId !== query.providerId) {
      return false;
    }

    if (query.contentType !== undefined && favoriteType(state) !== query.contentType) {
      return false;
    }

    if (needle.length > 0 && !favoriteTitle(state).toLowerCase().includes(needle)) {
      return false;
    }

    return true;
  });

  const sorted = filtered.slice().sort((left, right) => {
    if (query.sort === 'title-asc') {
      return favoriteTitle(left).localeCompare(favoriteTitle(right));
    }

    return Date.parse(right.favoritedAt ?? '') - Date.parse(left.favoritedAt ?? '');
  });

  return sorted;
}

export function parseFavoriteSortParam(value: string | null): FavoriteSort {
  return value === 'title-asc' ? 'title-asc' : 'favorited-desc';
}
