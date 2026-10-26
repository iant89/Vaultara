import { describe, expect, it } from 'vitest';
import { makeFile, makeItem } from '../test/fakeProvider';
import { createViewerRegistry } from './composition';
import { ViewerRegistry } from './registry';
import { selectViewer } from './select';
import type { ViewerModule } from './types';

function jpeg(id: string, extras: Parameters<typeof makeFile>[0] = {}) {
  return makeFile({
    id,
    name: id,
    mimeType: 'image/jpeg',
    extension: 'jpg',
    downloadAvailable: true,
    downloadUrl: `https://archive.org/download/photos/${id}`,
    ...extras,
  });
}

describe('selectViewer', () => {
  const registry = createViewerRegistry();

  it('selects the PDF reader for a downloadable PDF', () => {
    const item = makeItem({ type: 'document' });
    const pdf = makeFile({
      id: 'scan.pdf',
      name: 'scan.pdf',
      mimeType: 'application/pdf',
      downloadUrl: 'https://archive.org/download/book/scan.pdf',
    });

    const selection = selectViewer(registry, item, [pdf]);

    expect(selection?.viewer.descriptor.id).toBe('pdf');
    expect(selection?.file.id).toBe('scan.pdf');
  });

  it('selects the photo gallery for a photograph', () => {
    const item = makeItem({ type: 'image' });
    const selection = selectViewer(registry, item, [
      jpeg('still.jpg', { metadata: { source: 'original' } }),
    ]);

    expect(selection?.viewer.descriptor.id).toBe('image');
    expect(selection?.file.id).toBe('still.jpg');
  });

  it('honours an explicit file id even when another file scores higher', () => {
    const item = makeItem({ type: 'image' });
    const original = jpeg('page.jpg', { metadata: { source: 'original' } });
    const thumb = jpeg('page_thumb.jpg', {
      metadata: { source: 'derivative', format: 'JPEG Thumb' },
    });

    const selection = selectViewer(registry, item, [original, thumb], 'page_thumb.jpg');

    expect(selection?.file.id).toBe('page_thumb.jpg');
    expect(selection?.viewer.descriptor.id).toBe('image');
  });

  it('does not auto-select a thumbnail when an original photograph exists', () => {
    const item = makeItem({ type: 'image' });
    const thumb = jpeg('page_thumb.jpg', {
      metadata: { source: 'derivative', format: 'JPEG Thumb' },
    });
    const original = jpeg('page.jpg', { metadata: { source: 'original' } });

    const selection = selectViewer(registry, item, [thumb, original]);

    expect(selection?.file.id).toBe('page.jpg');
  });

  it('selects the audio player for a WAV and prefers the original over a 64kbps copy', () => {
    const item = makeItem({ type: 'audio' });
    const derivative = makeFile({
      id: 'track_64kb.mp3',
      name: 'track_64kb.mp3',
      mimeType: 'audio/mpeg',
      downloadUrl: 'https://archive.org/download/album/track_64kb.mp3',
      metadata: { format: '64Kbps MP3' },
    });
    const original = makeFile({
      id: 'theme.wav',
      name: 'theme.wav',
      mimeType: 'audio/wav',
      downloadUrl: 'https://archive.org/download/album/theme.wav',
      metadata: { source: 'original', format: 'WAVE' },
    });

    const selection = selectViewer(registry, item, [derivative, original]);

    expect(selection?.viewer.descriptor.id).toBe('audio');
    expect(selection?.file.id).toBe('theme.wav');
  });

  it('falls back to the generic viewer for a video', () => {
    const item = makeItem({ type: 'movie' });
    const video = makeFile({
      id: 'clip.mp4',
      name: 'clip.mp4',
      mimeType: 'video/mp4',
      downloadUrl: 'https://archive.org/download/film/clip.mp4',
    });

    const selection = selectViewer(registry, item, [video]);

    expect(selection?.viewer.descriptor.id).toBe('generic');
    expect(selection?.file.id).toBe('clip.mp4');
  });

  it('returns undefined when there are no files or no viewers', () => {
    expect(selectViewer(registry, makeItem(), [])).toBeUndefined();
    expect(selectViewer(new ViewerRegistry(), makeItem(), [jpeg('a.jpg')])).toBeUndefined();
  });

  it('prefers a specialized viewer over the generic fallback', () => {
    const local = new ViewerRegistry();
    const generic: ViewerModule = {
      descriptor: {
        id: 'generic',
        name: 'Generic',
        supportedContentTypes: ['image'],
        supportedMimeTypes: [],
        supportedExtensions: [],
        supportsFullscreen: false,
        supportsProgress: false,
        supportsOffline: false,
      },
      match: () => 1,
      load: async () => ({ default: () => null }),
    };
    const image: ViewerModule = {
      descriptor: {
        id: 'image',
        name: 'Gallery',
        supportedContentTypes: ['image'],
        supportedMimeTypes: ['image/jpeg'],
        supportedExtensions: ['jpg'],
        supportsFullscreen: true,
        supportsProgress: true,
        supportsOffline: false,
      },
      match: () => 80,
      load: async () => ({ default: () => null }),
    };

    local.register(generic);
    local.register(image);

    const selection = selectViewer(local, makeItem({ type: 'image' }), [jpeg('a.jpg')]);

    expect(selection?.viewer.descriptor.id).toBe('image');
  });
});
