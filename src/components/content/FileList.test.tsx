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

  it('offers View for a downloadable photograph', () => {
    renderList([
      makeFile({
        id: 'still.jpg',
        providerId: 'archive',
        itemId: 'photos',
        name: 'still.jpg',
        mimeType: 'image/jpeg',
        extension: 'jpg',
        downloadAvailable: true,
        downloadUrl: 'https://archive.org/download/photos/still.jpg',
      }),
    ]);

    expect(screen.getByRole('link', { name: 'View still.jpg' })).toHaveAttribute(
      'href',
      '/viewer/archive/photos?file=still.jpg',
    );
    expect(screen.getByText(/In-app gallery/)).toBeInTheDocument();
  });

  it('offers Listen for a downloadable audio file', () => {
    renderList([
      makeFile({
        id: 'theme.wav',
        providerId: 'archive',
        itemId: 'album',
        name: 'theme.wav',
        mimeType: 'audio/wav',
        extension: 'wav',
        downloadAvailable: true,
        downloadUrl: 'https://archive.org/download/album/theme.wav',
      }),
    ]);

    expect(screen.getByRole('link', { name: 'Listen theme.wav' })).toHaveAttribute(
      'href',
      '/viewer/archive/album?file=theme.wav',
    );
    expect(screen.getByText(/In-app player/)).toBeInTheDocument();
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
    expect(screen.getAllByText(/No in-app viewer/)).toHaveLength(2);
  });

  it('explains lending restrictions and never turns an unsafe URL into a download link', () => {
    renderList([
      makeFile({
        id: 'lend.pdf',
        name: 'lend.pdf',
        mimeType: 'application/pdf',
        downloadAvailable: false,
        accessStatus: 'lending-restricted',
      }),
      makeFile({
        id: 'payload.html',
        name: 'payload.html',
        downloadAvailable: true,
        downloadUrl: 'javascript:alert(1)',
      }),
    ]);

    expect(screen.queryByRole('link', { name: /Download / })).not.toBeInTheDocument();
    expect(screen.getByText(/requires borrowing/i)).toBeInTheDocument();
    expect(screen.getByText(/not a valid http\(s\) address/i)).toBeInTheDocument();
  });
});
