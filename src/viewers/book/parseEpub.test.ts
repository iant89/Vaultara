import { describe, expect, it } from 'vitest';
import { buildMinimalEpub } from './minimalEpub';
import { parseEpub, parsePlainText } from './parseEpub';
import { unzip } from './zip';

describe('parseEpub', () => {
  it('extracts chapter text and drops script', async () => {
    const files = await unzip(buildMinimalEpub());
    const book = parseEpub(files);

    expect(book.title).toBe('A test book');
    expect(book.chapters).toHaveLength(2);
    expect(book.chapters[0]?.title).toBe('Chapter one');
    expect(book.chapters[0]?.text).toBe('Once upon a time.');
    expect(book.chapters[0]?.text).not.toContain('alert');
    expect(book.chapters[1]?.text).toContain('The next morning.');
  });
});

describe('parsePlainText', () => {
  it('wraps a text file as a single chapter', () => {
    const book = parsePlainText('\uFEFFHello world.\n', 'notes.txt');

    expect(book.chapters).toHaveLength(1);
    expect(book.chapters[0]?.text).toBe('Hello world.');
  });
});
