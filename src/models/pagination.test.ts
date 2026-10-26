import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  calculateOffset,
  calculatePageCount,
  createPaginatedResult,
  resolvePaginationOptions,
} from './pagination';

describe('resolvePaginationOptions', () => {
  it('applies defaults when nothing is provided', () => {
    expect(resolvePaginationOptions()).toEqual({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
  });

  it('clamps out-of-range values instead of failing', () => {
    expect(resolvePaginationOptions({ page: 0, pageSize: 1_000 })).toEqual({
      page: 1,
      pageSize: MAX_PAGE_SIZE,
    });
    expect(resolvePaginationOptions({ page: -7, pageSize: -2 })).toEqual({ page: 1, pageSize: 1 });
  });

  it('truncates fractional values', () => {
    expect(resolvePaginationOptions({ page: 2.9, pageSize: 10.4 })).toEqual({
      page: 2,
      pageSize: 10,
    });
  });

  it('ignores a blank cursor and trims a real one', () => {
    expect(resolvePaginationOptions({ cursor: '   ' })).not.toHaveProperty('cursor');
    expect(resolvePaginationOptions({ cursor: '  abc  ' })).toEqual({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      cursor: 'abc',
    });
  });
});

describe('calculateOffset', () => {
  it('is zero-based across pages', () => {
    expect(calculateOffset(1, 24)).toBe(0);
    expect(calculateOffset(3, 24)).toBe(48);
  });

  it('guards against non-positive input', () => {
    expect(calculateOffset(0, 0)).toBe(0);
  });
});

describe('calculatePageCount', () => {
  it('returns zero when there is nothing to page', () => {
    expect(calculatePageCount(0, 24)).toBe(0);
  });

  it('rounds a partial final page up', () => {
    expect(calculatePageCount(25, 24)).toBe(2);
    expect(calculatePageCount(48, 24)).toBe(2);
  });
});

describe('createPaginatedResult', () => {
  it('reports more results when the total exceeds the current page', () => {
    const result = createPaginatedResult(['a', 'b'], { page: 1, pageSize: 2, total: 5 });

    expect(result.hasMore).toBe(true);
    expect(result.total).toBe(5);
  });

  it('reports no further results once the total is reached', () => {
    const result = createPaginatedResult(['a', 'b'], { page: 2, pageSize: 2, total: 4 });

    expect(result.hasMore).toBe(false);
  });

  it('trusts an explicit cursor over inferred paging', () => {
    const result = createPaginatedResult([], {
      page: 1,
      pageSize: 24,
      nextCursor: 'page-2',
    });

    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe('page-2');
  });

  it('infers availability from a full page when nothing else is known', () => {
    expect(createPaginatedResult(['a', 'b'], { page: 1, pageSize: 2 }).hasMore).toBe(true);
    expect(createPaginatedResult(['a'], { page: 1, pageSize: 2 }).hasMore).toBe(false);
  });

  it('omits unknown optional fields rather than inventing them', () => {
    const result = createPaginatedResult(['a'], { page: 1, pageSize: 24 });

    expect(result).not.toHaveProperty('total');
    expect(result).not.toHaveProperty('nextCursor');
  });
});
