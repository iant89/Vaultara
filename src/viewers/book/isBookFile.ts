/**
 * Book detection for the in-app reader.
 *
 * MIME type, extension, and file name are untrusted provider metadata (design spec 17.4).
 * Scanned books stay with the PDF or image viewers. This module only claims EPUB and
 * book-like plain text.
 */

export interface BookFileLike {
  readonly id?: string;
  readonly name: string;
  readonly mimeType?: string;
  readonly extension?: string;
  readonly downloadAvailable: boolean;
  readonly downloadUrl?: string;
}

const EPUB_MIME_TYPES: ReadonlySet<string> = new Set(['application/epub+zip', 'application/epub']);

export function isEpubFile(file: BookFileLike): boolean {
  const mime = file.mimeType?.toLowerCase().split(';')[0]?.trim();

  if (mime !== undefined && EPUB_MIME_TYPES.has(mime)) {
    return true;
  }

  if (file.extension !== undefined && file.extension.toLowerCase() === 'epub') {
    return true;
  }

  return /\.epub$/i.test(file.name);
}

const SKIP_TEXT_NAME = /(?:^|[_-])(?:scandata|metadata|readme|license|filesxml|djvu)(?:[_.]|$)/i;

export function isPlainTextBook(file: BookFileLike): boolean {
  if (SKIP_TEXT_NAME.test(file.name)) {
    return false;
  }

  const mime = file.mimeType?.toLowerCase().split(';')[0]?.trim();

  if (mime !== undefined && mime !== 'text/plain') {
    return false;
  }

  if (file.extension !== undefined) {
    return file.extension.toLowerCase() === 'txt';
  }

  return /\.txt$/i.test(file.name);
}

export function isBookFile(file: BookFileLike): boolean {
  return isEpubFile(file) || isPlainTextBook(file);
}

export function canReadBook(file: BookFileLike): boolean {
  return isBookFile(file) && file.downloadAvailable && file.downloadUrl !== undefined;
}
