import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { makeFile, makeItem } from '../test/fakeProvider';
import { ViewerContainer } from './ViewerContainer';
import { createViewerRegistry } from './composition';

const registry = createViewerRegistry();

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

  it('falls back to file details for a video', async () => {
    renderContainer([
      makeFile({
        id: 'clip.mp4',
        providerId: 'archive',
        itemId: 'item',
        name: 'clip.mp4',
        mimeType: 'video/mp4',
        downloadUrl: 'https://archive.org/download/item/clip.mp4',
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
});
