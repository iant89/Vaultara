import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeFile, makeItem } from '../../test/fakeProvider';
import { ImageGallery } from './ImageGallery';

const still = makeFile({
  id: 'still.jpg',
  providerId: 'archive',
  itemId: 'photos',
  name: 'still.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 4096,
  downloadUrl: 'https://archive.org/download/photos/still.jpg',
  metadata: { width: '800', height: '600', source: 'original' },
});

const next = makeFile({
  id: 'next.jpg',
  providerId: 'archive',
  itemId: 'photos',
  name: 'next.jpg',
  mimeType: 'image/jpeg',
  downloadUrl: 'https://archive.org/download/photos/next.jpg',
  metadata: { source: 'original' },
});

const item = makeItem({
  id: 'photos',
  providerId: 'archive',
  title: 'Pittsburgh photographs',
  type: 'image',
});

describe('ImageGallery', () => {
  it('shows the current photograph, metadata, and a provider download', () => {
    render(<ImageGallery item={item} files={[still, next]} activeFileId="still.jpg" />);

    expect(screen.getByRole('toolbar', { name: 'Photo gallery' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'still.jpg' })).toHaveAttribute(
      'src',
      'https://archive.org/download/photos/still.jpg',
    );
    expect(screen.getByText(/800 × 600/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download still.jpg' })).toHaveAttribute(
      'href',
      'https://archive.org/download/photos/still.jpg',
    );
    expect(screen.queryByRole('img', { name: 'next.jpg' })).not.toBeInTheDocument();
  });

  it('moves to the next photograph without rendering every image', async () => {
    const user = userEvent.setup();
    const onSelectFile = vi.fn();
    render(
      <ImageGallery
        item={item}
        files={[still, next]}
        activeFileId="still.jpg"
        onSelectFile={onSelectFile}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Next image' }));

    expect(onSelectFile).toHaveBeenCalledWith('next.jpg');
  });

  it('zooms in and returns to fit-to-screen', async () => {
    const user = userEvent.setup();
    render(<ImageGallery item={item} files={[still]} activeFileId="still.jpg" />);

    await user.click(screen.getByRole('button', { name: 'Zoom in' }));

    expect(screen.getByRole('button', { name: 'Fit to screen' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    await user.click(screen.getByRole('button', { name: 'Fit to screen' }));

    expect(screen.getByRole('button', { name: 'Fit to screen' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
