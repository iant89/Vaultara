import { describe, expect, it } from 'vitest';
import { isDirectChildCollection } from './catalog';

describe('isDirectChildCollection', () => {
  it('treats a collection listed only under the parent as a direct child', () => {
    expect(isDirectChildCollection('movies', ['movies'])).toBe(true);
  });

  it('rejects a nested collection whose field still names an intermediate parent', () => {
    expect(isDirectChildCollection('movies', ['feature_films', 'movies'])).toBe(false);
  });

  it('accepts that nested collection when asked about its immediate parent', () => {
    expect(
      isDirectChildCollection('feature_films', ['feature_films', 'movies'], {
        parentAncestors: ['movies'],
      }),
    ).toBe(true);
  });

  it('ignores the collection listing itself in its own field', () => {
    expect(
      isDirectChildCollection('software', ['software', 'softwarelibrary'], {
        childId: 'softwarelibrary',
      }),
    ).toBe(true);
  });

  it('treats a missing collection field as direct because the search already scoped the parent', () => {
    expect(isDirectChildCollection('movies', [])).toBe(true);
  });
});
