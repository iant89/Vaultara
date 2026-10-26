import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { makeFile } from '../../test/fakeProvider';
import { FileList } from './FileList';

function renderList(files: Parameters<typeof FileList>[0]['files']) {
  return render(
    <MemoryRouter>
      <FileList files={files} />
    </MemoryRouter>,
  );
}

describe('FileList', () => {
  it('offers Read next to Download for a PDF that can be fetched', () => {
    renderList([
      makeFile({
        id: 'alice.pdf',
        providerId: 'archive',
        itemId: 'alice',
        name: 'alice.pdf',
        mimeType: 'application/pdf',
        extension: 'pdf',
        downloadAvailable: true,
        downloadUrl: 'https://archive.org/download/alice/alice.pdf',
      }),
    ]);

    expect(screen.getByRole('link', { name: 'Read alice.pdf' })).toHaveAttribute(
      'href',
      '/viewer/archive/alice?file=alice.pdf',
    );
    expect(screen.getByRole('link', { name: 'Download alice.pdf' })).toHaveAttribute(
      'href',
      'https://archive.org/download/alice/alice.pdf',
    );
  });

  it('does not offer Read for a video or a restricted PDF', () => {
    renderList([
      makeFile({
        id: 'clip.mp4',
        providerId: 'archive',
        itemId: 'film',
        name: 'clip.mp4',
        mimeType: 'video/mp4',
        downloadAvailable: true,
        downloadUrl: 'https://archive.org/download/film/clip.mp4',
      }),
      makeFile({
        id: 'lend.pdf',
        providerId: 'archive',
        itemId: 'book',
        name: 'lend.pdf',
        mimeType: 'application/pdf',
        downloadAvailable: false,
      }),
    ]);

    expect(screen.queryByRole('link', { name: /Read / })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download clip.mp4' })).toBeInTheDocument();
    expect(screen.getByText('Not downloadable')).toBeInTheDocument();
  });
});
