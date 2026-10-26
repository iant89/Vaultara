import { describe, expect, it } from 'vitest';
import { canViewImage, isImageFile, isImageThumbnail } from './isImageFile';

function file(
  overrides: Partial<Parameters<typeof isImageFile>[0]> & { readonly id?: string } = {},
): Parameters<typeof isImageFile>[0] {
  return {
    name: 'still.jpg',
    downloadAvailable: true,
    downloadUrl: 'https://archive.org/download/photos/still.jpg',
    ...overrides,
  };
}

describe('isImageFile', () => {
  it('accepts JPEG, PNG, GIF, and WebP by MIME, extension, or name', () => {
    expect(isImageFile(file({ mimeType: 'image/jpeg', name: 'scan' }))).toBe(true);
    expect(isImageFile(file({ mimeType: undefined, extension: 'png', name: 'scan' }))).toBe(true);
    expect(
      isImageFile(file({ mimeType: undefined, extension: undefined, name: 'Shot.WEBP' })),
    ).toBe(true);
    expect(isImageFile(file({ mimeType: 'image/gif', name: 'loop.gif' }))).toBe(true);
  });

  it('rejects PDF, JPEG 2000, SVG, and video', () => {
    expect(
      isImageFile(file({ name: 'scan.pdf', mimeType: 'application/pdf', extension: 'pdf' })),
    ).toBe(false);
    expect(isImageFile(file({ name: 'scan.jp2', mimeType: 'image/jp2', extension: 'jp2' }))).toBe(
      false,
    );
    expect(
      isImageFile(file({ name: 'mark.svg', mimeType: 'image/svg+xml', extension: 'svg' })),
    ).toBe(false);
    expect(isImageFile(file({ name: 'clip.mp4', mimeType: 'video/mp4', extension: 'mp4' }))).toBe(
      false,
    );
  });
});

describe('isImageThumbnail', () => {
  it('recognises Archive thumb and tile derivatives', () => {
    expect(isImageThumbnail(file({ metadata: { format: 'JPEG Thumb' } }))).toBe(true);
    expect(isImageThumbnail(file({ metadata: { format: 'Item Tile' } }))).toBe(true);
    expect(isImageThumbnail(file({ name: 'page_thumb.jpg' }))).toBe(true);
    expect(isImageThumbnail(file({ name: 'page.jpg', metadata: { format: 'JPEG' } }))).toBe(false);
  });
});

describe('canViewImage', () => {
  it('requires a downloadable URL', () => {
    expect(canViewImage(file())).toBe(true);
    expect(canViewImage(file({ downloadAvailable: false, downloadUrl: undefined }))).toBe(false);
    expect(canViewImage(file({ downloadUrl: undefined }))).toBe(false);
  });
});
