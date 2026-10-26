/**
 * Game Boy ROM detection for the in-app emulator.
 *
 * MIME type, extension, and file name are untrusted provider metadata (design spec 17.4).
 * Only `.gb` / `application/x-gameboy-rom` are claimed. Game Boy Color, GBA, NES, and
 * Master System files stay off Play until those engines exist.
 */

export const GAME_BOY_MIME = 'application/x-gameboy-rom';

export interface GameBoyFileLike {
  readonly id?: string;
  readonly name: string;
  readonly mimeType?: string;
  readonly extension?: string;
  readonly downloadAvailable: boolean;
  readonly downloadUrl?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

const GAME_BOY_MIME_TYPES: ReadonlySet<string> = new Set([
  GAME_BOY_MIME,
  'application/x-gameboy-memory-cartridge',
]);

export function isGameBoyFile(file: GameBoyFileLike): boolean {
  const mime = file.mimeType?.toLowerCase().split(';')[0]?.trim();

  if (mime !== undefined && mime.length > 0) {
    if (GAME_BOY_MIME_TYPES.has(mime)) {
      return true;
    }

    if (
      mime.startsWith('image/') ||
      mime.startsWith('audio/') ||
      mime.startsWith('video/') ||
      mime.startsWith('text/') ||
      mime === 'application/pdf' ||
      mime === 'application/zip' ||
      mime === 'application/epub+zip'
    ) {
      return false;
    }
  }

  if (file.extension !== undefined && file.extension.toLowerCase() === 'gb') {
    return true;
  }

  return /\.gb$/i.test(file.name);
}

export function canPlayGameBoy(file: GameBoyFileLike): boolean {
  return isGameBoyFile(file) && file.downloadAvailable && file.downloadUrl !== undefined;
}
