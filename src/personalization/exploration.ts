/**
 * Exploration-history transitions (design spec 7.1, 7.3).
 *
 * Opening a collection never uses these helpers for its children. Callers mark one identity
 * when its details page opens or its viewer starts.
 */

import type { ContentIdentity } from '../models/identity';
import type { UserContentState, ViewerProgress } from '../models/userState';

export function blankContentState(identity: ContentIdentity): UserContentState {
  return {
    providerId: identity.providerId,
    itemId: identity.itemId,
    liked: false,
    favorited: false,
    explored: false,
  };
}

export function withExploration(
  existing: UserContentState | undefined,
  identity: ContentIdentity,
  now: string,
): UserContentState {
  const base = existing ?? blankContentState(identity);

  return {
    ...base,
    explored: true,
    firstExploredAt: base.firstExploredAt ?? now,
    lastExploredAt: now,
    explorationCount: (base.explorationCount ?? 0) + 1,
  };
}

export function withProgress(
  existing: UserContentState | undefined,
  identity: ContentIdentity,
  progress: ViewerProgress,
  now: string,
): UserContentState {
  const base = existing ?? blankContentState(identity);

  if (!base.explored) {
    return {
      ...withExploration(base, identity, now),
      progress,
    };
  }

  return { ...base, progress };
}

export function withoutExploration(state: UserContentState): UserContentState {
  return {
    providerId: state.providerId,
    itemId: state.itemId,
    liked: state.liked,
    favorited: state.favorited,
    explored: false,
    ...(state.snapshot !== undefined ? { snapshot: state.snapshot } : {}),
    ...(state.favoritedAt !== undefined ? { favoritedAt: state.favoritedAt } : {}),
  };
}

export function shouldRetainAfterHistoryReset(state: UserContentState): boolean {
  return state.liked || state.favorited;
}

export function isExploredRecord(state: UserContentState): boolean {
  return state.explored;
}
