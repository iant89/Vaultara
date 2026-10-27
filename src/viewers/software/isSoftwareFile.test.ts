import { describe, expect, it } from 'vitest';
import { canInspectSoftware, isDiskImageFile, isExecutableFile } from './isSoftwareFile';

describe('isSoftwareFile', () => {
  it('claims disk images and installers', () => {
    expect(isDiskImageFile({ name: 'dos.iso', mimeType: 'application/x-iso9660-image' })).toBe(
      true,
    );
    expect(isDiskImageFile({ name: 'mac.dmg', extension: 'dmg' })).toBe(true);
    expect(isExecutableFile({ name: 'setup.exe', extension: 'exe' })).toBe(true);
    expect(canInspectSoftware({ name: 'dos.iso', extension: 'iso' })).toBe(true);
  });

  it('does not claim media, books, WARCs, or Game Boy ROMs', () => {
    expect(canInspectSoftware({ name: 'still.jpg', mimeType: 'image/jpeg' })).toBe(false);
    expect(canInspectSoftware({ name: 'scan.pdf', mimeType: 'application/pdf' })).toBe(false);
    expect(canInspectSoftware({ name: 'site.warc.gz' })).toBe(false);
    expect(canInspectSoftware({ name: 'homebrew.gb', mimeType: 'application/x-gameboy-rom' })).toBe(
      false,
    );
  });

  it('claims ZIP only on software items', () => {
    expect(canInspectSoftware({ name: 'files.zip', mimeType: 'application/zip' })).toBe(false);
    expect(canInspectSoftware({ name: 'files.zip', mimeType: 'application/zip' }, 'software')).toBe(
      true,
    );
    expect(canInspectSoftware({ name: 'files.zip', mimeType: 'application/zip' }, 'movie')).toBe(
      false,
    );
  });
});
