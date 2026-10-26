/**
 * Fetch a Game Boy ROM and reject files this viewer will not feed to the emulator.
 *
 * The fetch needs CORS. A blocked or oversized download is explained; it is not proxied.
 * ROM bytes are never evaluated as JavaScript.
 */

import { createAppError, isAppError } from '../../models/errors';

/** Official GB carts top out well below this; 8 MB is the hard cap for a download. */
export const GAME_BOY_MAX_BYTES = 8 * 1024 * 1024;

/** Cartridge header ends at 0x14F. Anything shorter cannot be a ROM. */
export const GAME_BOY_MIN_BYTES = 0x150;

export function describeRomLoadFailure(error: unknown): string {
  const message = isAppError(error)
    ? error.message
    : error instanceof Error
      ? error.message
      : 'The ROM could not be opened.';
  const lower = message.toLowerCase();
  const blocked =
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('cors') ||
    lower.includes('cross-origin') ||
    lower.includes('load failed');

  if (blocked) {
    return 'This ROM could not be read in the browser. The provider did not allow this site to fetch it. Download the original or open it on the provider’s site.';
  }

  return message;
}

function looksLikeForeignFile(bytes: Uint8Array): boolean {
  if (bytes.length >= 4) {
    const zip = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
    const pdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
    const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    const riff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
    const ogg = bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53;

    if (zip || pdf || png || riff || ogg) {
      return true;
    }
  }

  if (bytes.length >= 2 && bytes[0] === 0x4d && bytes[1] === 0x5a) {
    return true;
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return true;
  }

  const head = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 64)).toLowerCase();

  return head.includes('<!doctype') || head.includes('<html') || head.includes('<?xml');
}

export function assertGameBoyRom(bytes: Uint8Array): void {
  if (bytes.byteLength < GAME_BOY_MIN_BYTES) {
    throw createAppError(
      'unsupported-format',
      'This file is too small to be a Game Boy ROM. The emulator was not started.',
    );
  }

  if (bytes.byteLength > GAME_BOY_MAX_BYTES) {
    throw createAppError(
      'invalid-response',
      'This ROM is larger than 8 MB, so this app does not download it. Download the original instead.',
    );
  }

  if (looksLikeForeignFile(bytes)) {
    throw createAppError(
      'unsupported-format',
      'This file is not a Game Boy ROM. The emulator was not started.',
    );
  }
}

async function readCapped(response: Response, signal: AbortSignal): Promise<Uint8Array> {
  const declared = Number(response.headers.get('content-length'));

  if (Number.isFinite(declared) && declared > GAME_BOY_MAX_BYTES) {
    throw createAppError(
      'invalid-response',
      'This ROM is larger than 8 MB, so this app does not download it. Download the original instead.',
    );
  }

  if (response.body === null) {
    const data = new Uint8Array(await response.arrayBuffer());

    if (data.byteLength > GAME_BOY_MAX_BYTES) {
      throw createAppError(
        'invalid-response',
        'This ROM is larger than 8 MB, so this app does not download it. Download the original instead.',
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

    if (total > GAME_BOY_MAX_BYTES) {
      await reader.cancel();
      throw createAppError(
        'invalid-response',
        'This ROM is larger than 8 MB, so this app does not download it. Download the original instead.',
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

  return output;
}

export async function loadRom(url: string, signal: AbortSignal): Promise<Uint8Array> {
  const response = await fetch(url, { signal, mode: 'cors', credentials: 'omit' });

  if (!response.ok) {
    throw createAppError(
      'network',
      `The ROM could not be downloaded (HTTP ${String(response.status)}).`,
    );
  }

  const bytes = await readCapped(response, signal);
  assertGameBoyRom(bytes);

  return bytes;
}
