import { afterEach, describe, expect, it, vi } from 'vitest';
import { WikipediaApi } from '../../providers/wikipedia/api';
import { PARSE_RESPONSE, createFetchStub, jsonResponse } from '../../providers/wikipedia/fixtures';
import { loadArticle } from './loadArticle';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadArticle', () => {
  it('sanitises parse HTML and keeps sections', async () => {
    const stub = createFetchStub(() => jsonResponse(PARSE_RESPONSE));
    const article = await loadArticle(
      'Ada_Lovelace',
      new AbortController().signal,
      new WikipediaApi({ fetchImpl: stub.fetcher }),
    );

    expect(article.displayTitle).toBe('Ada Lovelace');
    expect(article.html).toContain('Ada Lovelace was a mathematician.');
    expect(article.html).toContain('/item/wikipedia/Charles_Babbage');
    expect(article.html).not.toContain('script');
    expect(article.html).not.toContain('javascript:');
    expect(article.html).not.toContain('evil.example');
    expect(article.sections.map((section) => section.anchor)).toEqual(['Biography', 'References']);
  });
});
