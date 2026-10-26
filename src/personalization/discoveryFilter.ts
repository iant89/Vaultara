/**
 * Ordinary-discovery exclusion (design spec 7.2, AGENTS.md 8.2).
 *
 * Applied to home-page rows only. Search results and collection pages the reader opened
 * deliberately are never filtered by this rule.
 */

import { formatCanonicalId, type ContentIdentity } from '../models/identity';
import type { UserContentState } from '../models/userState';

export function contentStateKey(identity: ContentIdentity): string {
  return formatCanonicalId(identity);
}

export function isHiddenFromDiscovery(
  state: UserContentState | undefined,
  hideExplored: boolean,
): boolean {
  if (!hideExplored || state === undefined || !state.explored) {
    return false;
  }

  return !state.liked && !state.favorited;
}

export function filterDiscoveryItems<
  T extends { readonly providerId: string; readonly id: string },
>(
  items: readonly T[],
  states: ReadonlyMap<string, UserContentState>,
  hideExplored: boolean,
): readonly T[] {
  if (!hideExplored) {
    return items;
  }

  return items.filter((item) => {
    const state = states.get(contentStateKey({ providerId: item.providerId, itemId: item.id }));
    return !isHiddenFromDiscovery(state, hideExplored);
  });
}

export function indexContentStates(
  states: readonly UserContentState[],
): ReadonlyMap<string, UserContentState> {
  const index = new Map<string, UserContentState>();

  for (const state of states) {
    index.set(contentStateKey(state), state);
  }

  return index;
}
