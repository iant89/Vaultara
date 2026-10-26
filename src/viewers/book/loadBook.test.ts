import { afterEach, describe, expect, it, vi } from 'vitest';
import { BOOK_MAX_BYTES, loadBook } from './loadBook';
import { buildMinimalEpubBody } from './minimalEpub';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadBook', () => {
  it('refuses a download larger than 24 MiB without reading the body', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response('ignored', {
          status: 200,
          headers: { 'content-length': String(BOOK_MAX_BYTES + 1) },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      loadBook(
        'https://archive.org/download/alice/alice.epub',
        'epub',
        'alice.epub',
        new AbortController().signal,
      ),
    ).rejects.toThrow(/24 MB/);
  });

  it('parses a stored EPUB from a CORS fetch', async () => {
    const archive = buildMinimalEpubBody();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(archive, {
            status: 200,
            headers: {
              'content-type': 'application/epub+zip',
              'content-length': String(archive.byteLength),
            },
          }),
      ),
    );

    const book = await loadBook(
      'https://archive.org/download/alice/alice.epub',
      'epub',
      'alice.epub',
      new AbortController().signal,
    );

    expect(book.title).toBe('A test book');
    expect(book.chapters[0]?.text).toContain('Once upon a time.');
    expect(book.chapters[0]?.text).not.toContain('alert');
  });
});
