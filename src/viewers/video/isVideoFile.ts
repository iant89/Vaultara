/**
 * Video and caption detection for the in-app player.
 *
 * MIME type, extension, and file name are untrusted provider metadata (design spec 17.4).
 * Only formats a browser can actually play are offered. MPEG-2, AVI, MKV, and other
 * containers that need a decoder this app does not have stay off the Watch control.
 */

export interface VideoFileLike {
  readonly id?: string;
  readonly name: string;
  readonly mimeType?: string;
  readonly extension?: string;
  readonly downloadAvailable: boolean;
  readonly downloadUrl?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

const VIDEO_MIME_TYPES: ReadonlySet<string> = new Set([
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/ogv',
]);

const VIDEO_EXTENSIONS: ReadonlySet<string> = new Set(['mp4', 'webm', 'ogv']);

const VTT_MIME_TYPES: ReadonlySet<string> = new Set(['text/vtt', 'text/vtt; charset=utf-8']);

export function isVideoFile(file: VideoFileLike): boolean {
  const mime = file.mimeType?.toLowerCase();

  if (mime !== undefined) {
    if (mime.startsWith('audio/')) {
      return false;
    }

    if (VIDEO_MIME_TYPES.has(mime.split(';')[0]?.trim() ?? mime)) {
      return true;
    }

    if (mime.startsWith('video/')) {
      return false;
    }
  }

  if (file.extension !== undefined && VIDEO_EXTENSIONS.has(file.extension.toLowerCase())) {
    return true;
  }

  return /\.(mp4|webm|ogv)$/i.test(file.name);
}

/** Archive 512kb MPEG4 / Ogg Video derivatives remain playable but should not beat the original. */
export function isVideoDerivative(file: VideoFileLike): boolean {
  const format = String(file.metadata?.['format'] ?? '')
    .trim()
    .toLowerCase();

  if (format.includes('512kb') || format === 'ogg video' || format === 'mpeg4') {
    return true;
  }

  return /(?:^|[_-])(?:512kb|ogv)(?:[_.]|$)/i.test(file.name);
}

export function canPlayVideo(file: VideoFileLike): boolean {
  return isVideoFile(file) && file.downloadAvailable && file.downloadUrl !== undefined;
}

export function isVttCaption(file: VideoFileLike): boolean {
  const mime = file.mimeType?.toLowerCase().split(';')[0]?.trim();

  if (mime !== undefined && (VTT_MIME_TYPES.has(mime) || mime === 'text/vtt')) {
    return true;
  }

  if (file.extension !== undefined && file.extension.toLowerCase() === 'vtt') {
    return true;
  }

  return /\.vtt$/i.test(file.name);
}

export function canUseCaption(file: VideoFileLike): boolean {
  return isVttCaption(file) && file.downloadAvailable && file.downloadUrl !== undefined;
}
