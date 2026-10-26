import { describe, expect, it } from 'vitest';
import type { UserContentState } from '../models/userState';
import { filterDiscoveryItems, isHiddenFromDiscovery } from './discoveryFilter';

function state(flags: Partial<UserContentState>): UserContentState {
  return {
    providerId: 'archive',
    itemId: 'night',
    liked: false,
    favorited: false,
    explored: false,
    ...flags,
  };
}

const ITEM = { providerId: 'archive', id: 'night' };

describe('isHiddenFromDiscovery', () => {
  it.each([
    ['never explored', state({}), false, false],
    ['explored only', state({ explored: true }), true, true],
    ['explored and liked', state({ explored: true, liked: true }), true, false],
    ['explored and favorited', state({ explored: true, favorited: true }), true, false],
    ['explored but filtering off', state({ explored: true }), false, false],
    ['no state', undefined, true, false],
  ] as const)('%s', (_label, record, hide, expected) => {
    expect(isHiddenFromDiscovery(record, hide)).toBe(expected);
  });
});

describe('filterDiscoveryItems', () => {
  it('drops explored items from a discovery list and keeps liked ones', () => {
    const hidden = state({ itemId: 'seen', explored: true });
    const kept = state({ itemId: 'saved', explored: true, favorited: true });
    const items = [
      { providerId: 'archive', id: 'seen' },
      { providerId: 'archive', id: 'fresh' },
      { providerId: 'archive', id: 'saved' },
    ];
    const states = new Map<string, UserContentState>([
      ['archive:seen', hidden],
      ['archive:saved', kept],
    ]);

    expect(filterDiscoveryItems(items, states, true).map((item) => item.id)).toEqual([
      'fresh',
      'saved',
    ]);
    expect(filterDiscoveryItems(items, states, false)).toEqual(items);
  });

  it('does not hide an item merely because it appeared as a card', () => {
    expect(isHiddenFromDiscovery(undefined, true)).toBe(false);
    expect(filterDiscoveryItems([ITEM], new Map(), true)).toEqual([ITEM]);
  });
});
