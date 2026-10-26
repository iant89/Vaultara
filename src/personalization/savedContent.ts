/**
 * Like and favorite transitions (design spec 14).
 *
 * The two flags are independent. Progress tracking never calls these helpers.
 */

import type { ContentCollection, ContentItem, ContentType } from '../models/content';
import type { ContentIdentity } from '../models/identity';
import type { FavoriteSnapshot, UserContentState } from '../models/userState';
import { blankContentState } from './exploration';

export function snapshotFromItem(item: ContentItem): FavoriteSnapshot {
  return snapshotOf(item.title, item.type, item.thumbnailUrl ?? item.artworkUrl);
}

export function snapshotFromCollection(collection: ContentCollection): FavoriteSnapshot {
  return snapshotOf(
    collection.title,
    'collection',
    collection.thumbnailUrl ?? collection.artworkUrl,
  );
}

function snapshotOf(title: string, type: ContentType, thumbnailUrl?: string): FavoriteSnapshot {
  return {
    title,
    type,
    ...(thumbnailUrl !== undefined && thumbnailUrl.length > 0 ? { thumbnailUrl } : {}),
  };
}

export function withFavorite(
  existing: UserContentState | undefined,
  identity: ContentIdentity,
  favorited: boolean,
  now: string,
  snapshot?: FavoriteSnapshot,
): UserContentState {
  const base = existing ?? blankContentState(identity);
  const nextSnapshot = snapshot ?? base.snapshot;

  return {
    ...base,
    favorited,
    favoritedAt: favorited ? (base.favoritedAt ?? now) : undefined,
    ...(nextSnapshot !== undefined ? { snapshot: nextSnapshot } : {}),
  };
}

export function withLike(
  existing: UserContentState | undefined,
  identity: ContentIdentity,
  liked: boolean,
  snapshot?: FavoriteSnapshot,
): UserContentState {
  const base = existing ?? blankContentState(identity);
  const nextSnapshot = snapshot ?? base.snapshot;

  return {
    ...base,
    liked,
    ...(nextSnapshot !== undefined ? { snapshot: nextSnapshot } : {}),
  };
}

export function isEmptyContentState(state: UserContentState): boolean {
  return !state.liked && !state.favorited && !state.explored && state.progress === undefined;
}

export function isFavoriteRecord(state: UserContentState): boolean {
  return state.favorited;
}
