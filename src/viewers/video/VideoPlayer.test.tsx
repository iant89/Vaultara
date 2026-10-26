import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeFile, makeItem } from '../../test/fakeProvider';
import { VideoPlayer } from './VideoPlayer';

const clip = makeFile({
  id: 'night.mp4',
  providerId: 'archive',
  itemId: 'film',
  name: 'night.mp4',
  mimeType: 'video/mp4',
  sizeBytes: 4096,
  downloadUrl: 'https://archive.org/download/film/night.mp4',
  metadata: { source: 'original' },
});

const next = makeFile({
  id: 'trailer.mp4',
  providerId: 'archive',
  itemId: 'film',
  name: 'trailer.mp4',
  mimeType: 'video/mp4',
  downloadUrl: 'https://archive.org/download/film/trailer.mp4',
  metadata: { source: 'original' },
});

const captions = makeFile({
  id: 'english.vtt',
  providerId: 'archive',
  itemId: 'film',
  name: 'english.vtt',
  mimeType: 'text/vtt',
  downloadUrl: 'https://archive.org/download/film/english.vtt',
});

const item = makeItem({
  id: 'film',
  providerId: 'archive',
  title: 'Night of the Living Dead',
  type: 'movie',
});

describe('VideoPlayer', () => {
  it('shows controls, the provider stream, and a download', () => {
    render(<VideoPlayer item={item} files={[clip, next]} activeFileId="night.mp4" />);

    expect(screen.getByRole('toolbar', { name: 'Video player' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Seek' })).toBeInTheDocument();
    expect(document.querySelector('video')).toHaveAttribute(
      'src',
      'https://archive.org/download/film/night.mp4',
    );
    expect(screen.getByRole('link', { name: 'Download night.mp4' })).toHaveAttribute(
      'href',
      'https://archive.org/download/film/night.mp4',
    );
    expect(screen.getByText(/Playback streams from the provider/i)).toBeInTheDocument();
  });

  it('moves to the next video without loading every file', async () => {
    const user = userEvent.setup();
    const onSelectFile = vi.fn();
    render(
      <VideoPlayer
        item={item}
        files={[clip, next]}
        activeFileId="night.mp4"
        onSelectFile={onSelectFile}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Next video' }));

    expect(onSelectFile).toHaveBeenCalledWith('trailer.mp4');
  });

  it('records playback position when the video pauses', () => {
    const onProgressChange = vi.fn();
    render(
      <VideoPlayer
        item={item}
        files={[clip]}
        activeFileId="night.mp4"
        onProgressChange={onProgressChange}
      />,
    );

    document.querySelector('video')?.dispatchEvent(new Event('pause'));

    expect(onProgressChange).toHaveBeenCalledWith(expect.objectContaining({ kind: 'video' }));
  });

  it('pauses the element when the player unmounts', () => {
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const { unmount } = render(<VideoPlayer item={item} files={[clip]} activeFileId="night.mp4" />);

    unmount();

    expect(pause).toHaveBeenCalled();
    pause.mockRestore();
  });

  it('offers WebVTT captions when the item lists them', () => {
    render(<VideoPlayer item={item} files={[clip, captions]} activeFileId="night.mp4" />);

    expect(screen.getByLabelText('Captions')).toBeInTheDocument();
    expect(document.querySelector('track')).toHaveAttribute(
      'src',
      'https://archive.org/download/film/english.vtt',
    );
  });
});
