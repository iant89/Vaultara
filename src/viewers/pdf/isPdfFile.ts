/**
 * PDF detection for the in-app reader.
 *
 * MIME type, extension, and file name are all untrusted provider metadata (design spec 17.4).
 * Any one of them claiming PDF is enough to offer Read: Archive items often have a "Text PDF"
 * label, a `.pdf` name, or both, and requiring every field would hide readable files.
 */

export interface PdfFileLike {
  readonly id?: string;
  readonly name: string;
  readonly mimeType?: string;
  readonly extension?: string;
  readonly downloadAvailable: boolean;
  readonly downloadUrl?: string;
}

export function isPdfFile(file: PdfFileLike): boolean {
  if (file.mimeType === 'application/pdf') {
    return true;
  }

  if (file.extension?.toLowerCase() === 'pdf') {
    return true;
  }

  return /\.pdf$/i.test(file.name);
}

/**
 * A PDF the reader can actually open: it is a PDF, the provider permits retrieval, and there is
 * a URL to fetch. Lending-restricted and private files stay listed without a Read control.
 */
export function canReadPdf(file: PdfFileLike): boolean {
  return isPdfFile(file) && file.downloadAvailable && file.downloadUrl !== undefined;
}

export function selectPdfFile<T extends PdfFileLike>(
  files: readonly T[],
  requestedId?: string,
): T | undefined {
  const readable = files.filter(canReadPdf);

  if (requestedId !== undefined && requestedId.length > 0) {
    const requested = readable.find((file) => file.id === requestedId);

    if (requested !== undefined) {
      return requested;
    }
  }

  return readable[0];
}
