/**
 * Software artifact detection for the inspect-only viewer.
 *
 * MIME type, extension, and name are untrusted (design spec 17.4). Game Boy ROMs stay with
 * the emulator. WARC captures stay with the web-archive viewer. ZIP is only claimed on
 * software items so a random archive is not treated as a program.
 */

import type { ContentType } from '../../models/content';
import { looksLikeWarcName } from '../webarchive/isWebArchiveFile';

export const SOFTWARE_ISO_MIME = 'application/x-iso9660-image';

export interface SoftwareFileLike {
  readonly name: string;
  readonly mimeType?: string;
  readonly extension?: string;
}

const DISK_IMAGE_MIME_TYPES: ReadonlySet<string> = new Set([
  SOFTWARE_ISO_MIME,
  'application/x-apple-diskimage',
  'application/x-cd-image',
  'application/x-raw-disk-image',
  'application/x-iso9660-image',
]);

const EXECUTABLE_MIME_TYPES: ReadonlySet<string> = new Set([
  'application/x-msdownload',
  'application/vnd.microsoft.portable-executable',
  'application/x-msi',
  'application/vnd.debian.binary-package',
  'application/x-rpm',
  'application/vnd.android.package-archive',
]);

const DISK_IMAGE_EXTENSIONS: ReadonlySet<string> = new Set([
  'iso',
  'dmg',
  'vhd',
  'vhdx',
  'vmdk',
  'vdi',
  'dsk',
  'ima',
]);

const EXECUTABLE_EXTENSIONS: ReadonlySet<string> = new Set([
  'exe',
  'msi',
  'com',
  'deb',
  'rpm',
  'apk',
]);

const ARCHIVE_EXTENSIONS: ReadonlySet<string> = new Set(['zip', '7z', 'rar', 'tar']);

function extensionOf(file: SoftwareFileLike): string | undefined {
  if (file.extension !== undefined && file.extension.length > 0) {
    return file.extension.toLowerCase();
  }

  const dot = file.name.lastIndexOf('.');

  if (dot <= 0 || dot === file.name.length - 1) {
    return undefined;
  }

  return file.name.slice(dot + 1).toLowerCase();
}

function mimeOf(file: SoftwareFileLike): string | undefined {
  return file.mimeType?.toLowerCase().split(';')[0]?.trim();
}

function isForeignFormat(mime: string | undefined, file: SoftwareFileLike): boolean {
  if (looksLikeWarcName(file.name)) {
    return true;
  }

  if (mime === undefined || mime.length === 0) {
    return false;
  }

  return (
    mime.startsWith('image/') ||
    mime.startsWith('audio/') ||
    mime.startsWith('video/') ||
    mime.startsWith('text/') ||
    mime === 'application/pdf' ||
    mime === 'application/epub+zip' ||
    mime === 'application/x-gameboy-rom' ||
    mime === 'application/warc' ||
    mime === 'application/warc+gzip'
  );
}

export function isDiskImageFile(file: SoftwareFileLike): boolean {
  const mime = mimeOf(file);

  if (isForeignFormat(mime, file)) {
    return false;
  }

  if (mime !== undefined && DISK_IMAGE_MIME_TYPES.has(mime)) {
    return true;
  }

  const extension = extensionOf(file);

  if (extension === 'img') {
    return false;
  }

  return extension !== undefined && DISK_IMAGE_EXTENSIONS.has(extension);
}

export function isExecutableFile(file: SoftwareFileLike): boolean {
  const mime = mimeOf(file);

  if (isForeignFormat(mime, file)) {
    return false;
  }

  if (mime !== undefined && EXECUTABLE_MIME_TYPES.has(mime)) {
    return true;
  }

  const extension = extensionOf(file);

  return extension !== undefined && EXECUTABLE_EXTENSIONS.has(extension);
}

export function isSoftwareArchiveFile(file: SoftwareFileLike, itemType: ContentType): boolean {
  if (itemType !== 'software') {
    return false;
  }

  const mime = mimeOf(file);

  if (isForeignFormat(mime, file)) {
    return false;
  }

  if (
    mime === 'application/zip' ||
    mime === 'application/x-7z-compressed' ||
    mime === 'application/x-tar'
  ) {
    return true;
  }

  const extension = extensionOf(file);

  if (extension === 'img') {
    return mime === undefined || mime === 'application/octet-stream';
  }

  return extension !== undefined && ARCHIVE_EXTENSIONS.has(extension);
}

export function isSoftwareInspectFile(file: SoftwareFileLike, itemType?: ContentType): boolean {
  if (isDiskImageFile(file) || isExecutableFile(file)) {
    return true;
  }

  if (itemType === undefined) {
    return false;
  }

  return isSoftwareArchiveFile(file, itemType);
}

export function canInspectSoftware(file: SoftwareFileLike, itemType?: ContentType): boolean {
  return isSoftwareInspectFile(file, itemType);
}
