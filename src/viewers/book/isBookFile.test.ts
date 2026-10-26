import { describe, expect, it } from 'vitest';
import { canReadBook, isEpubFile, isPlainTextBook, type BookFileLike } from './isBookFile';

function file(overrides: Partial<BookFileLike> = {}): BookFileLike {
  return {
    name: 'alice.epub',
    downloadAvailable: true,
    downloadUrl: 'https://archive.org/download/alice/alice.epub',
    ...overrides,
  };
}

describe('isEpubFile', () => {
  it('accepts EPUB by MIME, extension, or name', () => {
    expect(isEpubFile(file({ mimeType: 'application/epub+zip', name: 'alice' }))).toBe(true);
    expect(isEpubFile(file({ mimeType: undefined, extension: 'epub', name: 'alice' }))).toBe(true);
    expect(
      isEpubFile(file({ mimeType: undefined, extension: undefined, name: 'Alice.EPUB' })),
    ).toBe(true);
  });

  it('rejects PDF and audio', () => {
    expect(
      isEpubFile(file({ name: 'scan.pdf', mimeType: 'application/pdf', extension: 'pdf' })),
    ).toBe(false);
    expect(isEpubFile(file({ name: 'track.mp3', mimeType: 'audio/mpeg', extension: 'mp3' }))).toBe(
      false,
    );
  });
});

describe('isPlainTextBook', () => {
  it('accepts ordinary .txt and skips metadata dumps', () => {
    expect(
      isPlainTextBook(file({ name: 'chapter.txt', mimeType: 'text/plain', extension: 'txt' })),
    ).toBe(true);
    expect(
      isPlainTextBook(file({ name: 'scandata.txt', mimeType: 'text/plain', extension: 'txt' })),
    ).toBe(false);
    expect(
      isPlainTextBook(
        file({ name: 'lendingbook_djvu.txt', mimeType: 'text/plain', extension: 'txt' }),
      ),
    ).toBe(false);
  });
});

describe('canReadBook', () => {
  it('requires a downloadable URL', () => {
    expect(canReadBook(file())).toBe(true);
    expect(canReadBook(file({ downloadAvailable: false, downloadUrl: undefined }))).toBe(false);
  });
});
