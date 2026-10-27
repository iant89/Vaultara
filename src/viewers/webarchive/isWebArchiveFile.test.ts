import { describe, expect, it } from 'vitest';
import { isWebArchiveFile, looksLikeWarcName } from './isWebArchiveFile';

describe('isWebArchiveFile', () => {
  it('claims WARC and ARC captures, including gzip names', () => {
    expect(isWebArchiveFile({ name: 'site.warc', mimeType: 'application/warc' })).toBe(true);
    expect(isWebArchiveFile({ name: 'site.warc.gz', extension: 'gz' })).toBe(true);
    expect(isWebArchiveFile({ name: 'site.arc.gz' })).toBe(true);
    expect(looksLikeWarcName('example.com-20050315.warc.gz')).toBe(true);
  });

  it('does not claim screenshots, HTML, ZIP, or Game Boy ROMs', () => {
    expect(isWebArchiveFile({ name: 'shot.jpg', mimeType: 'image/jpeg' })).toBe(false);
    expect(isWebArchiveFile({ name: 'page.html', mimeType: 'text/html' })).toBe(false);
    expect(isWebArchiveFile({ name: 'files.zip', mimeType: 'application/zip' })).toBe(false);
    expect(isWebArchiveFile({ name: 'homebrew.gb', mimeType: 'application/x-gameboy-rom' })).toBe(
      false,
    );
  });
});
