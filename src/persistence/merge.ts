/**
 * Conflict rules for user state (design spec 21.3).
 *
 * Favorites and likes merge by canonical item identity. When two devices write the same
 * identity, the record with the later `updatedAt` wins (including an unfavorite). Duplicate
 * operations are ignored by `opId` in the backend, not here.
 */

import { formatCanonicalId } from '../models/identity';
import type { UserPreferences } from '../models/account';
import type { StoredContentState } from './contract';

export function mergeContentStates(
  local: readonly StoredContentState[],
  remote: readonly StoredContentState[],
): readonly StoredContentState[] {
  const byId = new Map<string, StoredContentState>();

  for (const state of [...local, ...remote]) {
    const key = formatCanonicalId(state);
    const existing = byId.get(key);

    if (existing === undefined || laterOrEqual(state.updatedAt, existing.updatedAt)) {
      byId.set(key, state);
    }
  }

  return [...byId.values()];
}

export function mergePreferences(
  local: UserPreferences,
  remote: UserPreferences,
  localUpdatedAt: string,
  remoteUpdatedAt: string,
): UserPreferences {
  return laterOrEqual(localUpdatedAt, remoteUpdatedAt) ? local : remote;
}

function laterOrEqual(left: string, right: string): boolean {
  return Date.parse(left) >= Date.parse(right);
}
