import { describe, expect, it } from 'vitest';
import { canPlayGameBoy, isGameBoyFile } from './isGameBoyFile';

describe('isGameBoyFile', () => {
  it('recognises a Game Boy ROM by MIME or extension', () => {
    expect(
      isGameBoyFile({
        name: 'homebrew.gb',
        mimeType: 'application/x-gameboy-rom',
        downloadAvailable: true,
      }),
    ).toBe(true);
    expect(
      isGameBoyFile({
        name: 'HOMEBREW.GB',
        extension: 'gb',
        downloadAvailable: true,
      }),
    ).toBe(true);
  });

  it('does not claim later systems or unrelated binaries', () => {
    expect(
      isGameBoyFile({
        name: 'color.gbc',
        extension: 'gbc',
        downloadAvailable: true,
      }),
    ).toBe(false);
    expect(
      isGameBoyFile({
        name: 'advance.gba',
        mimeType: 'application/x-gba-rom',
        downloadAvailable: true,
      }),
    ).toBe(false);
    expect(
      isGameBoyFile({
        name: 'mario.nes',
        extension: 'nes',
        downloadAvailable: true,
      }),
    ).toBe(false);
    expect(
      isGameBoyFile({
        name: 'still.gb',
        mimeType: 'image/jpeg',
        downloadAvailable: true,
      }),
    ).toBe(false);
  });

  it('requires a downloadable URL before Play is offered', () => {
    expect(
      canPlayGameBoy({
        name: 'homebrew.gb',
        mimeType: 'application/x-gameboy-rom',
        downloadAvailable: true,
        downloadUrl: 'https://archive.org/download/gb/homebrew.gb',
      }),
    ).toBe(true);
    expect(
      canPlayGameBoy({
        name: 'homebrew.gb',
        mimeType: 'application/x-gameboy-rom',
        downloadAvailable: false,
        downloadUrl: 'https://archive.org/download/gb/homebrew.gb',
      }),
    ).toBe(false);
    expect(
      canPlayGameBoy({
        name: 'homebrew.gb',
        mimeType: 'application/x-gameboy-rom',
        downloadAvailable: true,
      }),
    ).toBe(false);
  });
});
