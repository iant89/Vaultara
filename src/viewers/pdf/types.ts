import type { PdfTextRun } from './text';

export interface PdfPageSize {
  readonly width: number;
  readonly height: number;
}

export interface PdfDocumentHandle {
  readonly pageCount: number;
  pageSize(pageNumber: number): Promise<PdfPageSize>;
  render(pageNumber: number, canvas: HTMLCanvasElement, scale: number): Promise<void>;
  textRuns(pageNumber: number): Promise<readonly PdfTextRun[]>;
  destroy(): void;
}

export interface OpenPdfOptions {
  readonly url: string;
  readonly signal?: AbortSignal;
}
