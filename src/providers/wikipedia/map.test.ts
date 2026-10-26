import { describe, expect, it } from 'vitest';
import { WIKIPEDIA_ARTICLE_MIME, WIKIPEDIA_LICENSE_URL, WIKIPEDIA_PROVIDER_ID } from './constants';
import { ADA_PAGE, CATEGORY_MEMBERS, MOST_VIEWED, PARSE_RESPONSE, SEARCH_PAGES } from './fixtures';
import {
  categoryTitle,
  mapArticleFile,
  mapPageRecord,
  mapSearchHit,
  readCategoryMembers,
  readLangLinks,
  readMostViewedTitles,
  readParseResult,
  readSearchHits,
  titleToItemId,
} from './map';

const urls = {
  articleUrl: (title: string) => `https://en.wikipedia.org/wiki/${title.replace(/ /g, '_')}`,
  languageArticleUrl: (lang: string, title: string) =>
    `https://${lang}.wikipedia.org/wiki/${title.replace(/ /g, '_')}`,
};

describe('Wikipedia mapping', () => {
  it('turns a page record into an attributed article', () => {
    const item = mapPageRecord(ADA_PAGE, urls);

    expect(item).toMatchObject({
      id: 'Ada_Lovelace',
      providerId: WIKIPEDIA_PROVIDER_ID,
      type: 'article',
      title: 'Ada Lovelace',
      creator: 'Wikipedia contributors',
      sourceUrl: 'https://en.wikipedia.org/wiki/Ada_Lovelace',
    });
    expect(item.rights?.license).toBe(WIKIPEDIA_LICENSE_URL);
    expect(item.thumbnailUrl).toContain('upload.wikimedia.org');
    expect(item.categories).toContain('English_mathematicians');
  });

  it('builds the synthetic article file the reader matches on', () => {
    const item = mapSearchHit({ title: 'Ada Lovelace' }, urls);
    const file = mapArticleFile(item);

    expect(file.id).toBe('article');
    expect(file.mimeType).toBe(WIKIPEDIA_ARTICLE_MIME);
    expect(file.viewable).toBe(true);
    expect(file.downloadUrl).toBe('https://en.wikipedia.org/wiki/Ada_Lovelace');
  });

  it('reads generator-search pages and most-viewed titles', () => {
    expect(readSearchHits(SEARCH_PAGES, urls).items[0]?.id).toBe('Ada_Lovelace');
    expect(readMostViewedTitles(MOST_VIEWED)).toEqual(['Ada Lovelace', 'Charles Babbage']);
  });

  it('reads subcategories and parse sections', () => {
    expect(readCategoryMembers(CATEGORY_MEMBERS, 'subcat')).toEqual(['Physics', 'Biology']);
    expect(readParseResult(PARSE_RESPONSE)?.sections.map((section) => section.anchor)).toEqual([
      'Biography',
      'References',
    ]);
  });

  it('reads language links', () => {
    expect(readLangLinks(ADA_PAGE, urls)).toEqual([
      {
        lang: 'it',
        title: 'Ada Lovelace',
        url: 'https://it.wikipedia.org/wiki/Ada_Lovelace',
      },
    ]);
  });

  it('normalizes category titles and item ids', () => {
    expect(categoryTitle('Category:Featured articles')).toBe('Featured_articles');
    expect(titleToItemId('Ada Lovelace')).toBe('Ada_Lovelace');
  });
});
