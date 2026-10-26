import { act, render, screen } from '@testing-library/react';
import type { ComponentType } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ContentViewerProps } from '../models/viewer';
import { makeFile, makeItem } from '../test/fakeProvider';
import { buildMinimalEpubBody } from './book/minimalEpub';
import { createViewerRegistry } from './composition';
import { ViewerRegistry } from './registry';
import { ViewerContainer } from './ViewerContainer';

const registry = createViewerRegistry();

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderContainer(
  files: Parameters<typeof ViewerContainer>[0]['files'],
  item = makeItem({ id: 'item', providerId: 'archive', title: 'A test item' }),
) {
  return render(
    <MemoryRouter>
      <ViewerContainer
        item={item}
        files={files}
        registry={registry}
        onSelectFile={() => undefined}
      />
    </MemoryRouter>,
  );
}

describe('ViewerContainer', () => {
  it('loads the photo gallery for a JPEG', async () => {
    renderContainer(
      [
        makeFile({
          id: 'still.jpg',
          providerId: 'archive',
          itemId: 'item',
          name: 'still.jpg',
          mimeType: 'image/jpeg',
          downloadUrl: 'https://archive.org/download/item/still.jpg',
          metadata: { source: 'original' },
        }),
      ],
      makeItem({ id: 'item', providerId: 'archive', title: 'Photos', type: 'image' }),
    );

    expect(await screen.findByRole('toolbar', { name: 'Photo gallery' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to item' })).toHaveAttribute(
      'href',
      '/item/archive/item',
    );
    expect(screen.getAllByRole('link', { name: 'Download still.jpg' }).length).toBeGreaterThan(0);
  });

  it('loads the audio player for a WAV', async () => {
    renderContainer(
      [
        makeFile({
          id: 'theme.wav',
          providerId: 'archive',
          itemId: 'item',
          name: 'theme.wav',
          mimeType: 'audio/wav',
          downloadUrl: 'https://archive.org/download/item/theme.wav',
          metadata: { source: 'original' },
        }),
      ],
      makeItem({ id: 'item', providerId: 'archive', title: 'A field recording', type: 'audio' }),
    );

    expect(await screen.findByRole('toolbar', { name: 'Audio player' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });

  it('loads the book reader for an EPUB', async () => {
    const archive = buildMinimalEpubBody();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(archive, {
            status: 200,
            headers: { 'content-type': 'application/epub+zip' },
          }),
      ),
    );

    renderContainer(
      [
        makeFile({
          id: 'alice.epub',
          providerId: 'archive',
          itemId: 'item',
          name: 'alice.epub',
          mimeType: 'application/epub+zip',
          downloadUrl: 'https://archive.org/download/item/alice.epub',
        }),
      ],
      makeItem({ id: 'item', providerId: 'archive', title: 'A test book', type: 'book' }),
    );

    expect(await screen.findByRole('toolbar', { name: 'Book reader' })).toBeInTheDocument();
    expect(screen.getByText('Once upon a time.')).toBeInTheDocument();
  });

  it('loads the video player for an MP4', async () => {
    renderContainer(
      [
        makeFile({
          id: 'clip.mp4',
          providerId: 'archive',
          itemId: 'item',
          name: 'clip.mp4',
          mimeType: 'video/mp4',
          downloadUrl: 'https://archive.org/download/item/clip.mp4',
          metadata: { source: 'original' },
        }),
      ],
      makeItem({ id: 'item', providerId: 'archive', title: 'A film', type: 'movie' }),
    );

    expect(await screen.findByRole('toolbar', { name: 'Video player' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });

  it('falls back to file details for Matroska', async () => {
    renderContainer([
      makeFile({
        id: 'clip.mkv',
        providerId: 'archive',
        itemId: 'item',
        name: 'clip.mkv',
        mimeType: 'video/x-matroska',
        downloadUrl: 'https://archive.org/download/item/clip.mkv',
      }),
    ]);

    expect(await screen.findByText(/no specialized viewer/i)).toBeInTheDocument();
  });

  it('says when the item has no files', () => {
    renderContainer([]);

    expect(screen.getByText('No files to view')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to item details' })).toHaveAttribute(
      'href',
      '/item/archive/item',
    );
  });

  it('does not mount a viewer that finished loading after unmount', async () => {
    let resolveLoad: (module: { default: ComponentType<ContentViewerProps> }) => void = () =>
      undefined;
    const local = new ViewerRegistry();
    local.register({
      descriptor: {
        id: 'slow',
        name: 'Slow',
        supportedContentTypes: ['unknown'],
        supportedMimeTypes: [],
        supportedExtensions: [],
        supportsFullscreen: false,
        supportsProgress: false,
        supportsOffline: false,
      },
      match: () => 50,
      load: () =>
        new Promise((resolve) => {
          resolveLoad = resolve;
        }),
    });

    const { unmount } = render(
      <MemoryRouter>
        <ViewerContainer
          item={makeItem({ id: 'item', providerId: 'archive' })}
          files={[
            makeFile({
              id: 'files.zip',
              name: 'files.zip',
              mimeType: 'application/zip',
              downloadUrl: 'https://archive.org/download/item/files.zip',
            }),
          ]}
          registry={local}
          onSelectFile={() => undefined}
        />
      </MemoryRouter>,
    );

    unmount();
    await act(async () => {
      resolveLoad({
        default: function Leaked() {
          return <p>leaked viewer</p>;
        },
      });
    });

    expect(screen.queryByText('leaked viewer')).not.toBeInTheDocument();
  });
});
