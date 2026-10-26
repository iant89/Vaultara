import { describe, expect, it } from 'vitest';
import { DISCOVERY_ROWS } from '../config/discovery';
import { featuredRowFor, rowsForCategories } from './discoveryRows';

describe('rowsForCategories', () => {
  it('returns every row when onboarding was skipped', () => {
    expect(rowsForCategories([])).toEqual(DISCOVERY_ROWS);
  });

  it('keeps the configured order of the selected families', () => {
    const rows = rowsForCategories(['software', 'movies']);

    expect(rows.map((row) => row.categoryId)).toEqual(['movies', 'software']);
  });

  it('falls back to every row when the stored ids are unknown', () => {
    expect(rowsForCategories(['comics'])).toEqual(DISCOVERY_ROWS);
  });
});

describe('featuredRowFor', () => {
  it('promotes films when that row is still visible', () => {
    expect(featuredRowFor(DISCOVERY_ROWS)?.categoryId).toBe('movies');
  });

  it('promotes the first remaining row when films were not selected', () => {
    expect(featuredRowFor(rowsForCategories(['audio']))?.categoryId).toBe('audio');
  });
});
