import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { makeFile, makeItem } from '../../test/fakeProvider';
import { PdfViewer } from './PdfViewer';
import type { PdfDocumentHandle } from './types';

beforeAll(() => {
  if (typeof HTMLDialogElement === 'undefined') {
    return;
  }

  if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute('open', '');
    };
  }

  if (typeof HTMLDialogElement.prototype.close !== 'function') {
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute('open');
    };
  }
});

function fakeDocument(pageCount = 8): PdfDocumentHandle {
  return {
    pageCount,
    async pageSize() {
      return { width: 200, height: 300 };
    },
    async render(_page, canvas, scale) {
      canvas.width = Math.max(1, Math.floor(200 * scale));
      canvas.height = Math.max(1, Math.floor(300 * scale));
      canvas.getContext('2d')?.fillRect(0, 0, canvas.width, canvas.height);
    },
    async textRuns(pageNumber) {
      return [
        {
          text: `Hello from page ${String(pageNumber)}`,
          x: 20,
          y: 40,
          width: 120,
          height: 14,
          fontName: 'Times-Roman',
        },
      ];
    },
    destroy() {},
  };
}

const file = makeFile({
  id: 'book.pdf',
  providerId: 'archive',
  itemId: 'book',
  name: 'book.pdf',
  mimeType: 'application/pdf',
  downloadUrl: 'https://archive.org/download/book/book.pdf',
});

const item = makeItem({ id: 'book', providerId: 'archive', title: 'A scanned book' });

function renderViewer(overrides: Partial<Parameters<typeof PdfViewer>[0]> = {}) {
  return render(
    <PdfViewer
      item={item}
      file={file}
      pdfFiles={[file]}
      document={fakeDocument()}
      {...overrides}
    />,
  );
}

describe('PdfViewer', () => {
  it('opens in book mode with a two-page spread', async () => {
    renderViewer();

    expect(screen.getByRole('toolbar', { name: 'PDF reader' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Book' })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByText('Pages 1–2 of 8')).toBeInTheDocument();
  });

  it('turns the page in book mode', async () => {
    const user = userEvent.setup();
    renderViewer();

    await user.click(screen.getByRole('button', { name: 'Next page' }));

    expect(await screen.findByText('Pages 3–4 of 8')).toBeInTheDocument();
  });

  it('reports the visible page as reading progress', async () => {
    const user = userEvent.setup();
    const onProgress = vi.fn();
    renderViewer({ onProgress });

    await screen.findByText('Pages 1–2 of 8');
    expect(onProgress).toHaveBeenCalledWith(1);

    await user.click(screen.getByRole('button', { name: 'Next page' }));

    expect(onProgress).toHaveBeenCalledWith(3);
  });

  it('shows a 2 by 2 grid and opens a page full screen', async () => {
    const user = userEvent.setup();
    renderViewer();

    await user.click(screen.getByRole('button', { name: '2 by 2 grid' }));

    expect(await screen.findByText('Pages 1–4 of 8')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Page 3, open full screen' }));

    const dialog = await screen.findByRole('dialog', { name: 'Full screen page' });
    expect(within(dialog).getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('covers original text with a translation that keeps the line box', async () => {
    const user = userEvent.setup();
    renderViewer({
      createTranslator: async () => ({
        translate: async (text) => text.replaceAll('Hello', 'Hola'),
      }),
    });

    await user.selectOptions(screen.getByLabelText('Translate'), 'es');

    expect((await screen.findAllByText('Hola from page 1')).length).toBeGreaterThan(0);
    expect(screen.getByText(/Translated text covers the original glyphs/i)).toBeInTheDocument();
  });

  it('says when the browser cannot translate instead of inventing a result', async () => {
    const user = userEvent.setup();
    renderViewer({
      createTranslator: async () => undefined,
    });

    await user.selectOptions(screen.getByLabelText('Translate'), 'fr');

    expect(await screen.findByText(/Translation is unavailable/i)).toBeInTheDocument();
  });
});
