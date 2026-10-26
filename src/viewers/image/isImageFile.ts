/**
 * Photograph detection for the in-app gallery.
 *
 * MIME type, extension, and file name are untrusted provider metadata (design spec 17.4).
 * Any one of them claiming a browser-displayable still image is enough to offer View.
 * JPEG 2000 and SVG are excluded: browsers cannot show JP2, and SVG is executable markup.
 */

export interface ImageFileLike {
  readonly id?: string;
  readonly name: string;
  readonly mimeType?: string;
  readonly extension?: string;
  readonly downloadAvailable: boolean;
  readonly downloadUrl?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

const IMAGE_MIME_TYPES: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const IMAGE_EXTENSIONS: ReadonlySet<string> = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);

const THUMB_FORMATS: ReadonlySet<string> = new Set(['jpeg thumb', 'item tile']);

export function isImageFile(file: ImageFileLike): boolean {
  if (file.mimeType !== undefined && IMAGE_MIME_TYPES.has(file.mimeType.toLowerCase())) {
    return true;
  }

  if (file.extension !== undefined && IMAGE_EXTENSIONS.has(file.extension.toLowerCase())) {
    return true;
  }

  return /\.(jpe?g|png|gif|webp)$/i.test(file.name);
}

/** Archive derivative thumbs and tiles — still openable, but not the default photograph. */
export function isImageThumbnail(file: ImageFileLike): boolean {
  const format = String(file.metadata?.['format'] ?? '')
    .trim()
    .toLowerCase();

  if (THUMB_FORMATS.has(format)) {
    return true;
  }

  return /(?:^|[_-])(?:thumb|tile|itemimage)(?:[_.]|$)/i.test(file.name);
}

/**
 * A still this gallery can actually open: it is a browser image, the provider permits
 * retrieval, and there is a URL. Lending-restricted files stay listed without View.
 */
export function canViewImage(file: ImageFileLike): boolean {
  return isImageFile(file) && file.downloadAvailable && file.downloadUrl !== undefined;
}
