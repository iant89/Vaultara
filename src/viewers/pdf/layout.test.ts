import { describe, expect, it } from 'vitest';
import {
  BOOK_TWO_PAGE_MIN_WIDTH,
  bookColumnCount,
  computeScale,
  describeVisiblePages,
  stepStartPage,
  visiblePages,
} from './layout';

describe('bookColumnCount', () => {
  it('uses one page when the stage is too narrow for a spread', () => {
    expect(bookColumnCount(0)).toBe(2);
    expect(bookColumnCount(390)).toBe(1);
    expect(bookColumnCount(BOOK_TWO_PAGE_MIN_WIDTH)).toBe(2);
  });
});

describe('visiblePages', () => {
  it('shows one page in page mode', () => {
    expect(visiblePages({ mode: 'page' }, 10, 4, 2)).toEqual([4]);
  });

  it('pairs consecutive pages in book mode', () => {
    expect(visiblePages({ mode: 'book' }, 10, 1, 2)).toEqual([1, 2]);
    expect(visiblePages({ mode: 'book' }, 10, 2, 2)).toEqual([1, 2]);
    expect(visiblePages({ mode: 'book' }, 10, 3, 2)).toEqual([3, 4]);
    expect(visiblePages({ mode: 'book' }, 5, 5, 2)).toEqual([5]);
  });

  it('falls back to one page when the book cannot spread', () => {
    expect(visiblePages({ mode: 'book' }, 10, 4, 1)).toEqual([4]);
  });

  it('fills a grid cell starting at the current page’s block', () => {
    expect(visiblePages({ mode: 'grid', gridColumns: 2 }, 10, 1, 2)).toEqual([1, 2, 3, 4]);
    expect(visiblePages({ mode: 'grid', gridColumns: 2 }, 10, 5, 2)).toEqual([5, 6, 7, 8]);
    expect(visiblePages({ mode: 'grid', gridColumns: 2 }, 6, 5, 2)).toEqual([5, 6]);
  });
});

describe('stepStartPage', () => {
  it('turns two pages in a spread and a full grid at a time', () => {
    expect(stepStartPage({ mode: 'book' }, 10, 1, 1, 2)).toBe(3);
    expect(stepStartPage({ mode: 'book' }, 10, 3, -1, 2)).toBe(1);
    expect(stepStartPage({ mode: 'grid', gridColumns: 2 }, 20, 1, 1, 2)).toBe(5);
    expect(stepStartPage({ mode: 'page' }, 10, 1, 1, 2)).toBe(2);
  });

  it('does not walk off the end of the document', () => {
    expect(stepStartPage({ mode: 'page' }, 3, 3, 1, 2)).toBe(3);
    expect(stepStartPage({ mode: 'book' }, 3, 1, -1, 2)).toBe(1);
  });
});

describe('describeVisiblePages', () => {
  it('names a single page or a range', () => {
    expect(describeVisiblePages([3], 12)).toBe('Page 3 of 12');
    expect(describeVisiblePages([3, 4], 12)).toBe('Pages 3–4 of 12');
  });
});

describe('computeScale', () => {
  it('fits width or the whole page and ignores empty boxes', () => {
    expect(computeScale({ width: 200, height: 400 }, { width: 100, height: 100 }, 'width')).toBe(
      0.5,
    );
    expect(computeScale({ width: 200, height: 400 }, { width: 100, height: 100 }, 'page')).toBe(
      0.25,
    );
    expect(computeScale({ width: 200, height: 400 }, { width: 0, height: 0 }, 'auto')).toBe(1);
  });
});
