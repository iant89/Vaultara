/**
 * PDF.js adapter.
 *
 * Isolated so the rest of the viewer can be tested with a fake document. PDF.js is untrusted-input
 * handling: parsing stops at errors rather than recovering broken content.
 */

import { GlobalWorkerOptions, Util, getDocument, type PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { createAppError } from '../../models/errors';
import type { PdfTextRun } from './text';
import type { OpenPdfOptions, PdfDocumentHandle } from './types';

export type { OpenPdfOptions, PdfDocumentHandle, PdfPageSize } from './types';

let workerConfigured = false;

function configureWorker(): void {
  if (workerConfigured) {
    return;
  }

  GlobalWorkerOptions.workerSrc = workerUrl;
  workerConfigured = true;
}

export async function openPdfDocument({ url, signal }: OpenPdfOptions): Promise<PdfDocumentHandle> {
  configureWorker();

  try {
    const task = getDocument({
      url,
      withCredentials: false,
      useSystemFonts: true,
      stopAtErrors: true,
    });
    abortWithSignal(task, signal);
    return wrapDocument(await task.promise);
  } catch (firstError) {
    if (signal?.aborted) {
      throw firstError;
    }

    const response = await fetch(url, { signal, mode: 'cors' });

    if (!response.ok) {
      throw createAppError(
        'network',
        `The PDF could not be downloaded (HTTP ${String(response.status)}).`,
      );
    }

    const data = await response.arrayBuffer();
    const task = getDocument({
      data,
      useSystemFonts: true,
      stopAtErrors: true,
    });
    abortWithSignal(task, signal);
    return wrapDocument(await task.promise);
  }
}

function abortWithSignal(task: { destroy: () => void }, signal: AbortSignal | undefined): void {
  if (signal === undefined) {
    return;
  }

  if (signal.aborted) {
    task.destroy();
    return;
  }

  signal.addEventListener(
    'abort',
    () => {
      task.destroy();
    },
    { once: true },
  );
}

function wrapDocument(pdf: PDFDocumentProxy): PdfDocumentHandle {
  const pages = new Map<number, Promise<Awaited<ReturnType<PDFDocumentProxy['getPage']>>>>();

  function loadPage(pageNumber: number) {
    const cached = pages.get(pageNumber);

    if (cached !== undefined) {
      return cached;
    }

    const loading = pdf.getPage(pageNumber);
    pages.set(pageNumber, loading);
    return loading;
  }

  return {
    pageCount: pdf.numPages,
    async pageSize(pageNumber) {
      const page = await loadPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });

      return { width: viewport.width, height: viewport.height };
    },
    async render(pageNumber, canvas, scale) {
      const page = await loadPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const ratio = globalThis.devicePixelRatio > 0 ? globalThis.devicePixelRatio : 1;
      const context = canvas.getContext('2d');

      if (context === null) {
        throw createAppError(
          'unknown',
          'This browser could not create a drawing surface for the PDF.',
        );
      }

      canvas.width = Math.max(1, Math.floor(viewport.width * ratio));
      canvas.height = Math.max(1, Math.floor(viewport.height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const renderTask = page.render({
        canvas,
        canvasContext: context,
        viewport,
      });
      await renderTask.promise;
    },
    async textRuns(pageNumber) {
      const page = await loadPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const runs: PdfTextRun[] = [];

      for (const item of content.items) {
        if (!isTextItem(item)) {
          continue;
        }

        const transform = Util.transform(viewport.transform, [...item.transform]) as number[];
        const x = transform[4] ?? 0;
        const y = transform[5] ?? 0;
        const height = Math.hypot(transform[2] ?? 0, transform[3] ?? 0) || item.height;
        const width = item.width;

        runs.push({
          text: item.str,
          x,
          y: y - height,
          width,
          height,
          fontName: item.fontName,
        });
      }

      return runs;
    },
    destroy() {
      void pdf.destroy();
      pages.clear();
    },
  };
}

interface PdfJsTextItem {
  readonly str: string;
  readonly transform: readonly number[];
  readonly width: number;
  readonly height: number;
  readonly fontName: string;
}

function isTextItem(item: unknown): item is PdfJsTextItem {
  if (typeof item !== 'object' || item === null) {
    return false;
  }

  const record = item as Record<string, unknown>;

  return (
    typeof record['str'] === 'string' &&
    Array.isArray(record['transform']) &&
    record['transform'].length >= 6 &&
    typeof record['width'] === 'number' &&
    typeof record['height'] === 'number' &&
    typeof record['fontName'] === 'string'
  );
}
