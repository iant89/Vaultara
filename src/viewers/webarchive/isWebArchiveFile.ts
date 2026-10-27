/**
 * Web-archive capture detection.
 *
 * MIME type, extension, and file name are untrusted provider metadata (design spec 17.4).
 * Only WARC/ARC captures are claimed. CDX indexes, HTML dumps, and screenshots stay elsewhere.
 */

export const WEB_ARCHIVE_MIME = 'application/warc';

export interface WebArchiveFileLike {
  readonly name: string;
  readonly mimeType?: string;
  readonly extension?: string;
}

const WEB_ARCHIVE_MIME_TYPES: ReadonlySet<string> = new Set([
  WEB_ARCHIVE_MIME,
  'application/warc+gzip',
  'application/x-internet-archive',
  'application/x-arc',
]);

export function looksLikeWarcName(fileName: string): boolean {
  const lower = fileName.toLowerCase();

  return (
    lower.endsWith('.warc') ||
    lower.endsWith('.warc.gz') ||
    lower.endsWith('.arc') ||
    lower.endsWith('.arc.gz')
  );
}

export function isWebArchiveFile(file: WebArchiveFileLike): boolean {
  const mime = file.mimeType?.toLowerCase().split(';')[0]?.trim();

  if (mime !== undefined && mime.length > 0) {
    if (WEB_ARCHIVE_MIME_TYPES.has(mime)) {
      return true;
    }

    if (
      mime.startsWith('image/') ||
      mime.startsWith('audio/') ||
      mime.startsWith('video/') ||
      mime.startsWith('text/') ||
      mime === 'application/pdf' ||
      mime === 'application/zip' ||
      mime === 'application/epub+zip' ||
      mime === 'application/x-gameboy-rom'
    ) {
      return false;
    }
  }

  if (file.extension !== undefined) {
    const extension = file.extension.toLowerCase();

    if (extension === 'warc' || extension === 'arc') {
      return true;
    }
  }

  return looksLikeWarcName(file.name);
}

export function canViewWebArchive(file: WebArchiveFileLike): boolean {
  return isWebArchiveFile(file);
}
