import { describe, expect, it } from 'vitest';
import {
  buildCategoryBrowsePath,
  buildCategoryPath,
  buildCollectionPath,
  buildDiscoverablePath,
  buildFavoritesPath,
  buildItemPath,
  buildOnboardingPath,
  buildProviderPath,
  buildSearchPath,
  buildViewerPath,
} from './links';

describe('item and viewer paths', () => {
  it('includes the provider id so colliding item ids stay distinct', () => {
    const archiveItem = buildItemPath({ providerId: 'archive', itemId: 'shared' });
    const wikiItem = buildItemPath({ providerId: 'wikipedia', itemId: 'shared' });

    expect(archiveItem).toBe('/item/archive/shared');
    expect(wikiItem).toBe('/item/wikipedia/shared');
    expect(archiveItem).not.toBe(wikiItem);
  });

  it('escapes path segments that would otherwise break routing', () => {
    expect(buildItemPath({ providerId: 'archive', itemId: 'folder/with space.pdf' })).toBe(
      '/item/archive/folder%2Fwith%20space.pdf',
    );
  });

  it('builds the viewer path from the same identity', () => {
    expect(buildViewerPath({ providerId: 'wikipedia', itemId: 'Ada_Lovelace' })).toBe(
      '/viewer/wikipedia/Ada_Lovelace',
    );
  });

  it('names the file being read in the query string', () => {
    expect(buildViewerPath({ providerId: 'archive', itemId: 'alice' }, 'alice.pdf')).toBe(
      '/viewer/archive/alice?file=alice.pdf',
    );
    expect(buildViewerPath({ providerId: 'archive', itemId: 'alice' }, 'folder/notes.pdf')).toBe(
      '/viewer/archive/alice?file=folder%2Fnotes.pdf',
    );
  });
});

describe('collection paths', () => {
  it('encodes both segments', () => {
    expect(buildCollectionPath('archive', 'classic films')).toBe(
      '/collection/archive/classic%20films',
    );
  });

  it('sends collection-typed results to the collection route', () => {
    expect(
      buildDiscoverablePath({ providerId: 'archive', id: 'SciFi_Horror', type: 'collection' }),
    ).toBe('/collection/archive/SciFi_Horror');
    expect(buildDiscoverablePath({ providerId: 'archive', id: 'nosferatu', type: 'movie' })).toBe(
      '/item/archive/nosferatu',
    );
  });
});

describe('other paths', () => {
  it('builds provider and category paths', () => {
    expect(buildProviderPath('archive')).toBe('/provider/archive');
    expect(buildCategoryPath('books')).toBe('/category/books');
    expect(buildCategoryBrowsePath('movies', 'archive')).toBe('/category/movies');
    expect(buildCategoryBrowsePath('Science', 'wikipedia')).toBe('/collection/wikipedia/Science');
    expect(buildFavoritesPath()).toBe('/favorites');
    expect(buildOnboardingPath()).toBe('/onboarding');
  });
});

describe('buildSearchPath', () => {
  it('omits the query parameter when there is no query', () => {
    expect(buildSearchPath()).toBe('/search');
    expect(buildSearchPath('   ')).toBe('/search');
  });

  it('encodes the query', () => {
    expect(buildSearchPath('silent film')).toBe('/search?q=silent%20film');
    expect(buildSearchPath('  ada lovelace  ')).toBe('/search?q=ada%20lovelace');
  });
});
