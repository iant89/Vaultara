import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeFile, makeItem } from '../../test/fakeProvider';
import { AudioPlayer } from './AudioPlayer';

const track = makeFile({
  id: 'theme.wav',
  providerId: 'archive',
  itemId: 'album',
  name: 'theme.wav',
  mimeType: 'audio/wav',
  sizeBytes: 4096,
  downloadUrl: 'https://archive.org/download/album/theme.wav',
  metadata: { source: 'original' },
});

const next = makeFile({
  id: 'reprise.wav',
  providerId: 'archive',
  itemId: 'album',
  name: 'reprise.wav',
  mimeType: 'audio/wav',
  sizeBytes: 2048,
  downloadUrl: 'https://archive.org/download/album/reprise.wav',
  metadata: { source: 'original' },
});

const item = makeItem({
  id: 'album',
  providerId: 'archive',
  title: 'A field recording',
  type: 'audio',
});

const peaks = Float32Array.from([0.2, 0.8, 0.4, 1]);

describe('AudioPlayer', () => {
  it('shows controls, a waveform from decoded peaks, and a provider download', async () => {
    render(
      <AudioPlayer
        item={item}
        files={[track, next]}
        activeFileId="theme.wav"
        loadWaveform={async () => peaks}
      />,
    );

    expect(screen.getByRole('toolbar', { name: 'Audio player' })).toBeInTheDocument();
    expect(await screen.findByRole('slider', { name: 'Seek' })).toBeInTheDocument();
    await waitFor(() => {
      expect(document.querySelector('canvas')).not.toBeNull();
    });
    expect(screen.getByRole('link', { name: 'Download theme.wav' })).toHaveAttribute(
      'href',
      'https://archive.org/download/album/theme.wav',
    );
    expect(screen.getByText(/Playback streams from the provider/i)).toBeInTheDocument();
  });

  it('moves to the next track without decoding every file', async () => {
    const user = userEvent.setup();
    const onSelectFile = vi.fn();
    render(
      <AudioPlayer
        item={item}
        files={[track, next]}
        activeFileId="theme.wav"
        onSelectFile={onSelectFile}
        loadWaveform={async () => peaks}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Next track' }));

    expect(onSelectFile).toHaveBeenCalledWith('reprise.wav');
  });

  it('explains when the waveform cannot be fetched and still offers playback', async () => {
    render(
      <AudioPlayer
        item={item}
        files={[track]}
        activeFileId="theme.wav"
        loadWaveform={async () => {
          throw new TypeError('Failed to fetch');
        }}
      />,
    );

    expect(
      await screen.findByText(/Waveform needs permission to fetch this file/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    expect(document.querySelector('canvas')).toBeNull();
  });

  it('records playback position when the audio pauses', async () => {
    const onProgressChange = vi.fn();
    render(
      <AudioPlayer
        item={item}
        files={[track]}
        activeFileId="theme.wav"
        onProgressChange={onProgressChange}
        loadWaveform={async () => peaks}
      />,
    );

    await screen.findByRole('slider', { name: 'Seek' });
    document.querySelector('audio')?.dispatchEvent(new Event('pause'));

    expect(onProgressChange).toHaveBeenCalledWith(expect.objectContaining({ kind: 'audio' }));
  });

  it('aborts the waveform fetch and pauses when the player unmounts', async () => {
    let signal: AbortSignal | undefined;
    const loadWaveform = vi.fn((_url: string, _bars: number, next: AbortSignal) => {
      signal = next;
      return new Promise<Float32Array>(() => undefined);
    });
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const { unmount } = render(
      <AudioPlayer
        item={item}
        files={[track]}
        activeFileId="theme.wav"
        loadWaveform={loadWaveform}
      />,
    );

    await waitFor(() => expect(loadWaveform).toHaveBeenCalled());
    unmount();

    expect(signal?.aborted).toBe(true);
    expect(pause).toHaveBeenCalled();
    pause.mockRestore();
  });

  it('does not fetch a waveform for a huge file', () => {
    const loadWaveform = vi.fn(async () => peaks);
    render(
      <AudioPlayer
        item={item}
        files={[
          makeFile({
            ...track,
            sizeBytes: 80 * 1024 * 1024,
          }),
        ]}
        activeFileId="theme.wav"
        loadWaveform={loadWaveform}
      />,
    );

    expect(loadWaveform).not.toHaveBeenCalled();
    expect(
      screen.getByText(/does not download the whole track just to draw it/i),
    ).toBeInTheDocument();
  });
});
