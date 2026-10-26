/**
 * Fetch a provider EPUB or text file and turn it into chapters.
 *
 * This fetch needs CORS. A blocked or oversized download is explained; it is not proxied.
 */

import { createAppError } from '../../models/errors';
import { parseEpub, parsePlainText, type ParsedBook } from './parseEpub';
import { unzip } from './zip';

/** Skip fetching a huge illustrated EPUB solely to extract its text (design spec 10.1). */
export const BOOK_MAX_BYTES = 24 * 1024 * 1024;

export function describeBookLoadFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : 'The book could not be opened.';
  const lower = message.toLowerCase();
  const blocked =
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('cors') ||
    lower.includes('cross-origin') ||
    lower.includes('load failed');

  if (blocked) {
    return 'This book could not be read in the browser. The provider did not allow this site to fetch it. Download the original or open it on the provider’s site.';
  }

  return message;
}

async function readCapped(response: Response, signal: AbortSignal): Promise<ArrayBuffer> {
  const declared = Number(response.headers.get('content-length'));

  if (Number.isFinite(declared) && declared > BOOK_MAX_BYTES) {
    throw createAppError(
      'invalid-response',
      'This book is larger than 24 MB, so this app does not download it just to extract text. Download the original instead.',
    );
  }

  if (response.body === null) {
    const data = await response.arrayBuffer();

    if (data.byteLength > BOOK_MAX_BYTES) {
      throw createAppError(
        'invalid-response',
        'This book is larger than 24 MB, so this app does not download it just to extract text. Download the original instead.',
      );
    }

    return data;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    if (signal.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const next = await reader.read();

    if (next.done) {
      break;
    }

    total += next.value.byteLength;

    if (total > BOOK_MAX_BYTES) {
      await reader.cancel();
      throw createAppError(
        'invalid-response',
        'This book is larger than 24 MB, so this app does not download it just to extract text. Download the original instead.',
      );
    }

    chunks.push(next.value);
  }

  const output = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return output.buffer;
}

export async function loadBook(
  url: string,
  kind: 'epub' | 'text',
  title: string,
  signal: AbortSignal,
): Promise<ParsedBook> {
  const response = await fetch(url, { signal, mode: 'cors', credentials: 'omit' });

  if (!response.ok) {
    throw createAppError(
      'network',
      `The book could not be downloaded (HTTP ${String(response.status)}).`,
    );
  }

  const data = await readCapped(response, signal);

  if (kind === 'text') {
    return parsePlainText(new TextDecoder('utf-8', { fatal: false }).decode(data), title);
  }

  return parseEpub(await unzip(data));
}
