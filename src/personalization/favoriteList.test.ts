import { describe, expect, it } from 'vitest';
import type { UserContentState } from '../models/userState';
import { listFavorites, parseFavoriteSortParam } from './favoriteList';

function favorite(itemId: string, extras: Partial<UserContentState> = {}): UserContentState {
  return {
    providerId: 'archive',
    itemId,
    liked: false,
    favorited: true,
    explored: false,
    favoritedAt: '2026-10-01T00:00:00.000Z',
    snapshot: { title: itemId, type: 'movie' },
    ...extras,
  };
}

describe('listFavorites', () => {
  it('omits likes that were never favorited', () => {
    const likedOnly: UserContentState = {
      providerId: 'archive',
      itemId: 'liked',
      liked: true,
      favorited: false,
      explored: false,
    };

    expect(listFavorites([favorite('saved'), likedOnly]).map((row) => row.itemId)).toEqual([
      'saved',
    ]);
  });

  it('filters, searches, and sorts from snapshots', () => {
    const rows = [
      favorite('night', {
        snapshot: { title: 'Night of the Living Dead', type: 'movie' },
        favoritedAt: '2026-10-02T00:00:00.000Z',
      }),
      favorite('alice', {
        providerId: 'archive',
        snapshot: { title: 'Alice in Wonderland', type: 'document' },
        favoritedAt: '2026-10-03T00:00:00.000Z',
      }),
      favorite('wiki', {
        providerId: 'wikipedia',
        snapshot: { title: 'Ada Lovelace', type: 'article' },
        favoritedAt: '2026-10-01T00:00:00.000Z',
      }),
    ];

    expect(listFavorites(rows).map((row) => row.itemId)).toEqual(['alice', 'night', 'wiki']);
    expect(listFavorites(rows, { sort: 'title-asc' }).map((row) => row.itemId)).toEqual([
      'wiki',
      'alice',
      'night',
    ]);
    expect(listFavorites(rows, { contentType: 'movie' }).map((row) => row.itemId)).toEqual([
      'night',
    ]);
    expect(listFavorites(rows, { providerId: 'wikipedia' }).map((row) => row.itemId)).toEqual([
      'wiki',
    ]);
    expect(listFavorites(rows, { query: 'alice' }).map((row) => row.itemId)).toEqual(['alice']);
  });
});

describe('parseFavoriteSortParam', () => {
  it('falls back to recently saved', () => {
    expect(parseFavoriteSortParam(null)).toBe('favorited-desc');
    expect(parseFavoriteSortParam('nope')).toBe('favorited-desc');
    expect(parseFavoriteSortParam('title-asc')).toBe('title-asc');
  });
});
