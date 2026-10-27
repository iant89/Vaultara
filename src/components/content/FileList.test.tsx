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
    expect(screen.getByRole('heading', { name: 'Read alice.pdf' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download alice.pdf' })).toHaveAttribute(
      'href',
      'https://archive.org/download/alice/alice.pdf',
    );
  });

  it('puts viewable files on cards and leaves other files in the list', () => {
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
      makeFile({
        id: 'clip.mkv',
        providerId: 'archive',
        itemId: 'alice',
        name: 'clip.mkv',
        mimeType: 'video/x-matroska',
        extension: 'mkv',
        downloadAvailable: true,
        downloadUrl: 'https://archive.org/download/alice/clip.mkv',
      }),
    ]);

    expect(screen.getByRole('heading', { name: 'Read alice.pdf' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /clip\.mkv/ })).not.toBeInTheDocument();
    expect(screen.getByText('clip.mkv')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Watch clip\.mkv/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download clip.mkv' })).toHaveAttribute(
      'href',
      'https://archive.org/download/alice/clip.mkv',
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

  it('offers Read for a downloadable EPUB', () => {
    renderList([
      makeFile({
        id: 'alice.epub',
        providerId: 'archive',
        itemId: 'alice',
        name: 'alice.epub',
        mimeType: 'application/epub+zip',
        extension: 'epub',
        downloadAvailable: true,
        downloadUrl: 'https://archive.org/download/alice/alice.epub',
      }),
    ]);

    expect(screen.getByRole('link', { name: 'Read alice.epub' })).toHaveAttribute(
      'href',
      '/viewer/archive/alice?file=alice.epub',
    );
    expect(screen.getByText(/In-app book/)).toBeInTheDocument();
  });

  it('offers Read for a Wikipedia article', () => {
    renderList([
      makeFile({
        id: 'article',
        providerId: 'wikipedia',
        itemId: 'Ada_Lovelace',
        name: 'Ada Lovelace',
        mimeType: 'application/vnd.vaultara.wikipedia+html',
        downloadAvailable: true,
        downloadUrl: 'https://en.wikipedia.org/wiki/Ada_Lovelace',
      }),
    ]);

    expect(screen.getByRole('link', { name: 'Read Ada Lovelace' })).toHaveAttribute(
      'href',
      '/viewer/wikipedia/Ada_Lovelace?file=article',
    );
    expect(screen.getByText(/In-app article/)).toBeInTheDocument();
  });

  it('offers Watch for a downloadable video', () => {
    renderList([
      makeFile({
        id: 'clip.mp4',
        providerId: 'archive',
        itemId: 'film',
        name: 'clip.mp4',
        mimeType: 'video/mp4',
        extension: 'mp4',
        downloadAvailable: true,
        downloadUrl: 'https://archive.org/download/film/clip.mp4',
      }),
    ]);

    expect(screen.getByRole('link', { name: 'Watch clip.mp4' })).toHaveAttribute(
      'href',
      '/viewer/archive/film?file=clip.mp4',
    );
    expect(screen.getByText(/In-app video/)).toBeInTheDocument();
  });

  it('offers Play for a downloadable Game Boy ROM', () => {
    renderList([
      makeFile({
        id: 'homebrew.gb',
        providerId: 'archive',
        itemId: 'gb',
        name: 'homebrew.gb',
        mimeType: 'application/x-gameboy-rom',
        extension: 'gb',
        downloadAvailable: true,
        downloadUrl: 'https://archive.org/download/gb/homebrew.gb',
      }),
    ]);

    expect(screen.getByRole('link', { name: 'Play homebrew.gb' })).toHaveAttribute(
      'href',
      '/viewer/archive/gb?file=homebrew.gb',
    );
    expect(screen.getByText(/In-app emulator/)).toBeInTheDocument();
  });

  it('offers View for a web-archive capture', () => {
    renderList([
      makeFile({
        id: 'site.warc.gz',
        providerId: 'archive',
        itemId: 'web_stub',
        name: 'site.warc.gz',
        mimeType: 'application/warc',
        downloadAvailable: true,
        downloadUrl: 'https://archive.org/download/web_stub/site.warc.gz',
      }),
    ]);

    expect(screen.getByRole('link', { name: 'View site.warc.gz' })).toHaveAttribute(
      'href',
      '/viewer/archive/web_stub?file=site.warc.gz',
    );
    expect(screen.getByText(/In-app archive/)).toBeInTheDocument();
  });

  it('offers Inspect for a disk image', () => {
    renderList([
      makeFile({
        id: 'dos.iso',
        providerId: 'archive',
        itemId: 'dos_stub',
        name: 'dos.iso',
        mimeType: 'application/x-iso9660-image',
        extension: 'iso',
        downloadAvailable: true,
        downloadUrl: 'https://archive.org/download/dos_stub/dos.iso',
      }),
    ]);

    expect(screen.getByRole('link', { name: 'Inspect dos.iso' })).toHaveAttribute(
      'href',
      '/viewer/archive/dos_stub?file=dos.iso',
    );
    expect(screen.getByText(/Software details/)).toBeInTheDocument();
  });

  it('does not offer Read for a Matroska file or a restricted PDF', () => {
    renderList([
      makeFile({
        id: 'clip.mkv',
        providerId: 'archive',
        itemId: 'film',
        name: 'clip.mkv',
        mimeType: 'video/x-matroska',
        downloadAvailable: true,
        downloadUrl: 'https://archive.org/download/film/clip.mkv',
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
    expect(screen.getByRole('link', { name: 'Download clip.mkv' })).toBeInTheDocument();
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
