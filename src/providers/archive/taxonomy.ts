/**
 * Archive vocabulary mapped onto the shared content models (design specification 11.2, 11.3).
 *
 * The Archive describes an item with a `mediatype` and describes each of its files with a
 * human-readable `format` label ("Text PDF", "VBR MP3", "h.264 IA"). Neither is a MIME type, and
 * the metadata API does not return one, so this module is the single place where those labels
 * become something the rest of the application can act on.
 *
 * Unknown labels deliberately produce nothing rather than a guess: a file with an unrecognized
 * format is still listed, it just cannot be offered for in-browser viewing.
 */

import type { ContentType } from '../../models/content';
import { normalizeContentType } from '../normalize';

/**
 * Archive mediatypes → shared content types.
 *
 * `texts` maps to `document` rather than `book` because the Archive does not distinguish a
 * scanned book from a scanned report; guessing from subject or collection labels would make an
 * item's type depend on which request produced it. `etree` is the Live Music Archive, whose items
 * are recordings, hence `music`.
 */
const MEDIATYPE_CONTENT_TYPE: Readonly<Record<string, ContentType>> = {
  texts: 'document',
  movies: 'movie',
  audio: 'audio',
  etree: 'music',
  image: 'image',
  software: 'software',
  data: 'software',
  web: 'website',
  collection: 'collection',
  account: 'unknown',
  tour: 'unknown',
};

export function mapMediatype(value: unknown): ContentType {
  const key = typeof value === 'string' ? value.trim().toLowerCase() : '';

  if (key === '') {
    return 'unknown';
  }

  // Fall back to the shared alias table so a new mediatype that happens to match a known alias
  // ("audio", "image", "video") is still typed rather than dropped to `unknown`.
  return MEDIATYPE_CONTENT_TYPE[key] ?? normalizeContentType(key);
}

/** Format labels seen in Archive `files[].format`, lower-cased. */
const FORMAT_MIME_TYPE: Readonly<Record<string, string>> = {
  'text pdf': 'application/pdf',
  'additional text pdf': 'application/pdf',
  pdf: 'application/pdf',
  epub: 'application/epub+zip',
  'djvu xml': 'image/vnd.djvu',
  djvu: 'image/vnd.djvu',
  djvutxt: 'text/plain',
  metadata: 'application/json',
  scandata: 'application/xml',
  'item cdx index': 'text/plain',
  'item cdx meta-index': 'text/plain',
  'vbr mp3': 'audio/mpeg',
  mp3: 'audio/mpeg',
  '64kbps mp3': 'audio/mpeg',
  'ogg vorbis': 'audio/ogg',
  flac: 'audio/flac',
  wave: 'audio/wav',
  'h.264': 'video/mp4',
  'h.264 ia': 'video/mp4',
  mpeg4: 'video/mp4',
  '512kb mpeg4': 'video/mp4',
  'ogg video': 'video/ogg',
  webm: 'video/webm',
  mpeg2: 'video/mpeg',
  jpeg: 'image/jpeg',
  'jpeg thumb': 'image/jpeg',
  'item tile': 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  'jpeg 2000': 'image/jp2',
};

const EXTENSION_MIME_TYPE: Readonly<Record<string, string>> = {
  pdf: 'application/pdf',
  epub: 'application/epub+zip',
  djvu: 'image/vnd.djvu',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  flac: 'audio/flac',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  mp4: 'video/mp4',
  webm: 'video/webm',
  ogv: 'video/ogg',
  mpg: 'video/mpeg',
  mpeg: 'video/mpeg',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  jp2: 'image/jp2',
  txt: 'text/plain',
  xml: 'application/xml',
  json: 'application/json',
  zip: 'application/zip',
  torrent: 'application/x-bittorrent',
};

const EXTENSION_PATTERN = /^[a-z0-9]{1,8}$/;

/** Lower-case extension of a file name, or `undefined` when it has none. */
export function resolveFileExtension(fileName: string): string | undefined {
  const dot = fileName.lastIndexOf('.');

  if (dot <= 0 || dot === fileName.length - 1) {
    return undefined;
  }

  const candidate = fileName.slice(dot + 1).toLowerCase();

  return EXTENSION_PATTERN.test(candidate) ? candidate : undefined;
}

/**
 * Resolve a MIME type from the Archive's format label, falling back to the file extension. The
 * label wins because it distinguishes derivatives that share an extension (a "JPEG Thumb" and a
 * full "JPEG" are both `.jpg`, but only the label says which is which).
 */
export function resolveMimeType(format: unknown, fileName: string): string | undefined {
  const label = typeof format === 'string' ? format.trim().toLowerCase() : '';
  const fromLabel = FORMAT_MIME_TYPE[label];

  if (fromLabel !== undefined) {
    return fromLabel;
  }

  const extension = resolveFileExtension(fileName);

  return extension === undefined ? undefined : EXTENSION_MIME_TYPE[extension];
}

/**
 * Formats a browser can present without a dedicated viewer.
 *
 * This deliberately excludes PDF, EPUB, and DjVu: opening those needs a viewer that does not
 * exist yet (roadmap Phase 8), and claiming they are viewable now would present an unimplemented
 * capability as working.
 */
const BROWSER_DISPLAYABLE_MIME_TYPES: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'audio/mpeg',
  'audio/ogg',
  'audio/flac',
  'audio/wav',
  'video/mp4',
  'video/webm',
  'video/ogg',
  'text/plain',
]);

export function isBrowserDisplayable(mimeType: string | undefined): boolean {
  return mimeType !== undefined && BROWSER_DISPLAYABLE_MIME_TYPES.has(mimeType);
}
