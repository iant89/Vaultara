import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeFile, makeItem } from '../../test/fakeProvider';
import { BookReader } from './BookReader';
import type { ParsedBook } from './parseEpub';

const epub = makeFile({
  id: 'alice.epub',
  providerId: 'archive',
  itemId: 'alice',
  name: 'alice.epub',
  mimeType: 'application/epub+zip',
  downloadUrl: 'https://archive.org/download/alice/alice.epub',
});

const item = makeItem({
  id: 'alice',
  providerId: 'archive',
  title: 'Alice in Wonderland',
  type: 'book',
});

const book: ParsedBook = {
  title: 'Alice in Wonderland',
  chapters: [
    {
      id: 'c1',
      title: 'Down the rabbit hole',
      href: 'c1.xhtml',
      text: 'Alice was beginning to get very tired.',
    },
    { id: 'c2', title: 'The pool of tears', href: 'c2.xhtml', text: 'Curiouser and curiouser.' },
  ],
};

describe('BookReader', () => {
  it('shows chapter text, typography, and a provider download', async () => {
    render(
      <BookReader item={item} files={[epub]} activeFileId="alice.epub" load={async () => book} />,
    );

    expect(await screen.findByRole('toolbar', { name: 'Book reader' })).toBeInTheDocument();
    expect(screen.getByText('Alice was beginning to get very tired.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download alice.epub' })).toHaveAttribute(
      'href',
      'https://archive.org/download/alice/alice.epub',
    );
    expect(screen.getByText(/shows the book’s text/i)).toBeInTheDocument();
  });

  it('moves to the next chapter from the table of contents', async () => {
    const user = userEvent.setup();
    render(
      <BookReader item={item} files={[epub]} activeFileId="alice.epub" load={async () => book} />,
    );

    await screen.findByText('Alice was beginning to get very tired.');
    await user.selectOptions(screen.getByLabelText('Contents'), 'c2');

    expect(screen.getByText('Curiouser and curiouser.')).toBeInTheDocument();
  });

  it('explains a CORS failure without inventing chapters', async () => {
    render(
      <BookReader
        item={item}
        files={[epub]}
        activeFileId="alice.epub"
        load={async () => {
          throw new TypeError('Failed to fetch');
        }}
      />,
    );

    expect(
      await screen.findByText(/provider did not allow this site to fetch it/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download alice.epub' })).toHaveAttribute(
      'href',
      'https://archive.org/download/alice/alice.epub',
    );
  });

  it('restores a saved chapter and reports progress when the chapter changes', async () => {
    const user = userEvent.setup();
    const onProgressChange = vi.fn();
    render(
      <BookReader
        item={item}
        files={[epub]}
        activeFileId="alice.epub"
        initialProgress={{
          kind: 'book',
          chapterId: 'c2',
          positionPercent: 0,
          updatedAt: '2026-10-26T00:00:00.000Z',
        }}
        onProgressChange={onProgressChange}
        load={async () => book}
      />,
    );

    expect(await screen.findByText('Curiouser and curiouser.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Previous chapter' }));

    expect(screen.getByText('Alice was beginning to get very tired.')).toBeInTheDocument();
    expect(onProgressChange).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'book', chapterId: 'c1', positionPercent: 0 }),
    );
  });

  it('aborts the in-flight fetch when the reader unmounts', async () => {
    let signal: AbortSignal | undefined;
    const load = vi.fn(
      (_url: string, _kind: 'epub' | 'text', _title: string, next: AbortSignal) => {
        signal = next;
        return new Promise<ParsedBook>(() => undefined);
      },
    );
    const { unmount } = render(
      <BookReader item={item} files={[epub]} activeFileId="alice.epub" load={load} />,
    );

    await waitFor(() => expect(load).toHaveBeenCalled());
    unmount();

    expect(signal?.aborted).toBe(true);
  });
});
