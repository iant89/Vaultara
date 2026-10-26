/**
 * Audio detection for the in-app player.
 *
 * MIME type, extension, and file name are untrusted provider metadata (design spec 17.4).
 * Only formats a browser can actually play are offered. MIDI, WMA, and other containers
 * that need a decoder this app does not have stay off the Listen control.
 */

export interface AudioFileLike {
  readonly id?: string;
  readonly name: string;
  readonly mimeType?: string;
  readonly extension?: string;
  readonly downloadAvailable: boolean;
  readonly downloadUrl?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

const AUDIO_MIME_TYPES: ReadonlySet<string> = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/ogg',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/flac',
  'audio/mp4',
  'audio/aac',
  'audio/x-m4a',
  'audio/webm',
]);

const AUDIO_EXTENSIONS: ReadonlySet<string> = new Set([
  'mp3',
  'ogg',
  'oga',
  'wav',
  'flac',
  'm4a',
  'aac',
  'weba',
]);

export function isAudioFile(file: AudioFileLike): boolean {
  if (file.mimeType !== undefined && AUDIO_MIME_TYPES.has(file.mimeType.toLowerCase())) {
    return true;
  }

  if (file.extension !== undefined && AUDIO_EXTENSIONS.has(file.extension.toLowerCase())) {
    return true;
  }

  return /\.(mp3|ogg|oga|wav|flac|m4a|aac|weba)$/i.test(file.name);
}

/** Archive 64kbps / ogg derivatives remain playable but should not beat the original. */
export function isAudioDerivative(file: AudioFileLike): boolean {
  const format = String(file.metadata?.['format'] ?? '')
    .trim()
    .toLowerCase();

  if (format.includes('64kbps') || format === 'ogg vorbis') {
    return true;
  }

  return /(?:^|[_-])(?:64kb|vbr)(?:[_.]|$)/i.test(file.name);
}

export function canPlayAudio(file: AudioFileLike): boolean {
  return isAudioFile(file) && file.downloadAvailable && file.downloadUrl !== undefined;
}
