import { describe, expect, it } from 'vitest';
import { canReadWikipedia, isWikipediaArticle } from './isWikipediaFile';

describe('isWikipediaArticle', () => {
  it('matches this provider’s synthetic article file', () => {
    expect(
      isWikipediaArticle({
        id: 'article',
        providerId: 'wikipedia',
        name: 'Ada Lovelace',
        mimeType: 'application/vnd.vaultara.wikipedia+html',
        downloadAvailable: true,
        downloadUrl: 'https://en.wikipedia.org/wiki/Ada_Lovelace',
      }),
    ).toBe(true);
  });

  it('does not claim Archive HTML or other providers', () => {
    expect(
      isWikipediaArticle({
        id: 'page.html',
        providerId: 'archive',
        name: 'page.html',
        mimeType: 'text/html',
        downloadAvailable: true,
        downloadUrl: 'https://archive.org/download/item/page.html',
      }),
    ).toBe(false);
  });

  it('requires a downloadable original URL before offering Read', () => {
    expect(
      canReadWikipedia({
        id: 'article',
        providerId: 'wikipedia',
        name: 'Ada Lovelace',
        mimeType: 'application/vnd.vaultara.wikipedia+html',
        downloadAvailable: false,
      }),
    ).toBe(false);
  });
});
