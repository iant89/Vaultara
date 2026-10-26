import { describe, expect, it } from 'vitest';
import { makeItem } from '../test/fakeProvider';
import { isEmptyContentState, snapshotFromItem, withFavorite, withLike } from './savedContent';

const IDENTITY = { providerId: 'archive', itemId: 'night' };
const NOW = '2026-10-26T12:00:00.000Z';
const SNAPSHOT = { title: 'Night of the Living Dead', type: 'movie' as const };

describe('withFavorite', () => {
  it('does not like an item that was only favorited', () => {
    const saved = withFavorite(undefined, IDENTITY, true, NOW, SNAPSHOT);

    expect(saved.favorited).toBe(true);
    expect(saved.liked).toBe(false);
    expect(saved.favoritedAt).toBe(NOW);
    expect(saved.snapshot).toEqual(SNAPSHOT);
  });

  it('keeps a like when the favorite is removed', () => {
    const liked = withLike(undefined, IDENTITY, true, SNAPSHOT);
    const both = withFavorite(liked, IDENTITY, true, NOW, SNAPSHOT);
    const unfavorited = withFavorite(both, IDENTITY, false, NOW);

    expect(unfavorited.favorited).toBe(false);
    expect(unfavorited.liked).toBe(true);
    expect(unfavorited.favoritedAt).toBeUndefined();
  });
});

describe('withLike', () => {
  it('does not favorite an item that was only liked', () => {
    const liked = withLike(undefined, IDENTITY, true, SNAPSHOT);

    expect(liked.liked).toBe(true);
    expect(liked.favorited).toBe(false);
    expect(isEmptyContentState(liked)).toBe(false);
  });
});

describe('snapshotFromItem', () => {
  it('prefers the thumbnail over the larger artwork', () => {
    expect(
      snapshotFromItem(
        makeItem({
          title: 'Night',
          type: 'movie',
          thumbnailUrl: 'https://example.test/thumb.jpg',
          artworkUrl: 'https://example.test/art.jpg',
        }),
      ),
    ).toEqual({
      title: 'Night',
      type: 'movie',
      thumbnailUrl: 'https://example.test/thumb.jpg',
    });
  });
});
