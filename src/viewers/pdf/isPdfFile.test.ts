import { describe, expect, it } from 'vitest';
import { canReadPdf, isPdfFile, selectPdfFile } from './isPdfFile';

function file(
  overrides: Partial<Parameters<typeof isPdfFile>[0]> & { readonly id?: string } = {},
): Parameters<typeof isPdfFile>[0] & { readonly id: string } {
  return {
    id: 'file.pdf',
    name: 'file.pdf',
    downloadAvailable: true,
    downloadUrl: 'https://archive.org/download/item/file.pdf',
    ...overrides,
  };
}

describe('isPdfFile', () => {
  it('accepts MIME type, extension, or name', () => {
    expect(
      isPdfFile(file({ mimeType: 'application/pdf', name: 'scan', extension: undefined })),
    ).toBe(true);
    expect(isPdfFile(file({ mimeType: undefined, extension: 'pdf', name: 'scan' }))).toBe(true);
    expect(isPdfFile(file({ mimeType: undefined, extension: undefined, name: 'Notes.PDF' }))).toBe(
      true,
    );
  });

  it('rejects other formats', () => {
    expect(
      isPdfFile(
        file({ id: 'clip.mp4', name: 'clip.mp4', mimeType: 'video/mp4', extension: 'mp4' }),
      ),
    ).toBe(false);
  });
});

describe('canReadPdf', () => {
  it('requires a downloadable URL', () => {
    expect(canReadPdf(file())).toBe(true);
    expect(canReadPdf(file({ downloadAvailable: false, downloadUrl: undefined }))).toBe(false);
    expect(canReadPdf(file({ downloadUrl: undefined }))).toBe(false);
  });
});

describe('selectPdfFile', () => {
  const pdf = file({ id: 'a.pdf', name: 'a.pdf' });
  const other = file({ id: 'b.pdf', name: 'b.pdf' });
  const video = file({
    id: 'c.mp4',
    name: 'c.mp4',
    mimeType: 'video/mp4',
    extension: 'mp4',
  });

  it('honours an explicit file id when that file is readable', () => {
    expect(selectPdfFile([pdf, other, video], 'b.pdf')?.id).toBe('b.pdf');
  });

  it('falls back to the first readable PDF', () => {
    expect(selectPdfFile([video, pdf, other])?.id).toBe('a.pdf');
    expect(selectPdfFile([video])).toBeUndefined();
  });
});
