import { describe, expect, it } from 'vitest';
import {
  shouldRetainAfterHistoryReset,
  withExploration,
  withoutExploration,
  withProgress,
} from './exploration';

const IDENTITY = { providerId: 'archive', itemId: 'night' };
const NOW = '2026-10-26T12:00:00.000Z';
const LATER = '2026-10-26T13:00:00.000Z';

describe('withExploration', () => {
  it('records the first visit and increments later ones', () => {
    const first = withExploration(undefined, IDENTITY, NOW);

    expect(first).toMatchObject({
      ...IDENTITY,
      explored: true,
      firstExploredAt: NOW,
      lastExploredAt: NOW,
      explorationCount: 1,
      liked: false,
      favorited: false,
    });

    const second = withExploration(first, IDENTITY, LATER);

    expect(second.firstExploredAt).toBe(NOW);
    expect(second.lastExploredAt).toBe(LATER);
    expect(second.explorationCount).toBe(2);
    expect(second.liked).toBe(false);
  });

  it('does not clear a like when the item is opened again', () => {
    const liked = withExploration(
      { ...IDENTITY, liked: true, favorited: false, explored: false },
      IDENTITY,
      NOW,
    );

    expect(liked.liked).toBe(true);
    expect(liked.explored).toBe(true);
  });
});

describe('withProgress', () => {
  it('marks an unexplored viewer start once, then updates the page without counting again', () => {
    const started = withProgress(
      undefined,
      IDENTITY,
      { kind: 'pdf', page: 1, updatedAt: NOW },
      NOW,
    );

    expect(started.explored).toBe(true);
    expect(started.explorationCount).toBe(1);
    expect(started.progress).toEqual({ kind: 'pdf', page: 1, updatedAt: NOW });

    const turned = withProgress(
      started,
      IDENTITY,
      { kind: 'pdf', page: 4, updatedAt: LATER },
      LATER,
    );

    expect(turned.explorationCount).toBe(1);
    expect(turned.lastExploredAt).toBe(NOW);
    expect(turned.progress).toEqual({ kind: 'pdf', page: 4, updatedAt: LATER });
  });

  it('stores book, audio, video, and image progress without counting another visit', () => {
    const started = withProgress(
      undefined,
      IDENTITY,
      { kind: 'audio', positionSeconds: 12, updatedAt: NOW },
      NOW,
    );
    const later = withProgress(
      started,
      IDENTITY,
      { kind: 'book', chapterId: 'c2', positionPercent: 40, updatedAt: LATER },
      LATER,
    );

    expect(later.explorationCount).toBe(1);
    expect(later.progress).toEqual({
      kind: 'book',
      chapterId: 'c2',
      positionPercent: 40,
      updatedAt: LATER,
    });
  });
});

describe('history reset', () => {
  it('keeps likes and favorites and drops exploration-only records', () => {
    const liked = {
      ...IDENTITY,
      liked: true,
      favorited: false,
      explored: true,
      firstExploredAt: NOW,
      lastExploredAt: NOW,
      explorationCount: 2,
    };

    expect(shouldRetainAfterHistoryReset(liked)).toBe(true);
    expect(withoutExploration(liked)).toMatchObject({
      ...IDENTITY,
      liked: true,
      favorited: false,
      explored: false,
    });
    expect(
      shouldRetainAfterHistoryReset({
        ...IDENTITY,
        liked: false,
        favorited: false,
        explored: true,
      }),
    ).toBe(false);
  });
});
