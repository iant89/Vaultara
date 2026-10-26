import { describe, expect, it } from 'vitest';
import { mergeContentStates, mergePreferences } from './merge';
import type { StoredContentState } from './contract';
import { DEFAULT_PREFERENCES } from '../models/account';

function state(
  itemId: string,
  updatedAt: string,
  flags: Partial<StoredContentState> = {},
): StoredContentState {
  return {
    providerId: 'archive',
    itemId,
    liked: false,
    favorited: false,
    explored: false,
    updatedAt,
    ...flags,
  };
}

describe('mergeContentStates', () => {
  it('keeps the later write for the same identity', () => {
    const merged = mergeContentStates(
      [state('night', '2026-01-01T00:00:00.000Z', { favorited: true })],
      [state('night', '2026-02-01T00:00:00.000Z', { favorited: false })],
    );

    expect(merged).toEqual([state('night', '2026-02-01T00:00:00.000Z', { favorited: false })]);
  });

  it('unions different identities', () => {
    const merged = mergeContentStates(
      [state('alpha', '2026-01-01T00:00:00.000Z', { favorited: true })],
      [state('beta', '2026-01-01T00:00:00.000Z', { liked: true })],
    );

    expect(merged).toHaveLength(2);
  });
});

describe('mergePreferences', () => {
  it('keeps the later preferences document', () => {
    const remote = {
      ...DEFAULT_PREFERENCES,
      disabledProviderIds: ['wikipedia'],
    };

    expect(
      mergePreferences(
        DEFAULT_PREFERENCES,
        remote,
        '2026-01-01T00:00:00.000Z',
        '2026-03-01T00:00:00.000Z',
      ),
    ).toEqual(remote);
  });
});
