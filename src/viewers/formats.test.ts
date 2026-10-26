import { describe, expect, it } from 'vitest';
import { makeFile, makeItem } from '../test/fakeProvider';
import { createViewerRegistry } from './composition';
import { selectViewer } from './select';

/**
 * Phase 12.6: supported and unsupported formats through the real registry.
 *
 * MIME type, extension, and name are untrusted. The specialized viewer must only claim a file
 * a browser (or the in-app reader) can actually present.
 */

const registry = createViewerRegistry();

function listed(name: string, mimeType: string): ReturnType<typeof makeFile> {
  const extension = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : undefined;

  return makeFile({
    id: name,
    name,
    mimeType,
    ...(extension !== undefined ? { extension } : {}),
    downloadAvailable: true,
    downloadUrl: `https://archive.org/download/item/${name}`,
  });
}

describe('core viewer formats', () => {
  it.each([
    ['scan.pdf', 'application/pdf', 'document', 'pdf'],
    ['still.jpg', 'image/jpeg', 'image', 'image'],
    ['still.png', 'image/png', 'image', 'image'],
    ['loop.gif', 'image/gif', 'image', 'image'],
    ['shot.webp', 'image/webp', 'image', 'image'],
    ['theme.mp3', 'audio/mpeg', 'audio', 'audio'],
    ['theme.ogg', 'audio/ogg', 'audio', 'audio'],
    ['theme.wav', 'audio/wav', 'audio', 'audio'],
    ['theme.flac', 'audio/flac', 'audio', 'audio'],
    ['theme.m4a', 'audio/mp4', 'audio', 'audio'],
    ['theme.aac', 'audio/aac', 'audio', 'audio'],
    ['clip.mp4', 'video/mp4', 'movie', 'video'],
    ['clip.webm', 'video/webm', 'movie', 'video'],
    ['clip.ogv', 'video/ogg', 'movie', 'video'],
    ['alice.epub', 'application/epub+zip', 'book', 'book'],
    ['chapter.txt', 'text/plain', 'document', 'book'],
  ] as const)('opens %s with the %s viewer', (name, mime, type, viewerId) => {
    const selection = selectViewer(registry, makeItem({ type }), [listed(name, mime)]);

    expect(selection?.viewer.descriptor.id).toBe(viewerId);
    expect(selection?.file.id).toBe(name);
  });

  it.each([
    ['clip.mkv', 'video/x-matroska'],
    ['clip.avi', 'video/x-msvideo'],
    ['clip.mpg', 'video/mpeg'],
    ['english.srt', 'application/x-subrip'],
    ['scan.jp2', 'image/jp2'],
    ['mark.svg', 'image/svg+xml'],
    ['tune.mid', 'audio/midi'],
    ['files.zip', 'application/zip'],
    ['scan.djvu', 'image/vnd.djvu'],
    ['scandata.txt', 'text/plain'],
  ] as const)('does not invent a specialized viewer for %s', (name, mime) => {
    const selection = selectViewer(registry, makeItem({ type: 'unknown' }), [listed(name, mime)]);

    expect(selection?.viewer.descriptor.id).toBe('generic');
  });
});
