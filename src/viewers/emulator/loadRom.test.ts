import { afterEach, describe, expect, it, vi } from 'vitest';
import { GAME_BOY_MAX_BYTES, assertGameBoyRom, describeRomLoadFailure, loadRom } from './loadRom';
import { buildMinimalGbRom } from './minimalRom';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('assertGameBoyRom', () => {
  it('accepts a header-sized ROM and rejects foreign containers', () => {
    expect(() => assertGameBoyRom(buildMinimalGbRom())).not.toThrow();
    expect(() => assertGameBoyRom(new Uint8Array(16))).toThrow(/too small/);
    expect(() =>
      assertGameBoyRom(Uint8Array.from([0x50, 0x4b, 0x03, 0x04, ...Array(400).fill(0)])),
    ).toThrow(/not a Game Boy ROM/);
    expect(() =>
      assertGameBoyRom(new TextEncoder().encode(`<!doctype html>${'x'.repeat(400)}`)),
    ).toThrow(/not a Game Boy ROM/);
  });
});

describe('loadRom', () => {
  it('downloads a ROM that fits the cap', async () => {
    const rom = buildMinimalGbRom();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(rom.slice().buffer, {
            status: 200,
            headers: { 'content-type': 'application/octet-stream' },
          }),
      ),
    );

    await expect(
      loadRom('https://archive.org/download/gb/homebrew.gb', new AbortController().signal),
    ).resolves.toEqual(rom);
  });

  it('refuses an oversized Content-Length without reading the body', async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response('nope', {
        status: 200,
        headers: { 'content-length': String(GAME_BOY_MAX_BYTES + 1) },
      });
    });
    vi.stubGlobal('fetch', fetchImpl);

    await expect(
      loadRom('https://archive.org/download/gb/huge.gb', new AbortController().signal),
    ).rejects.toMatchObject({ kind: 'invalid-response' });
  });

  it('explains a CORS failure without claiming the emulator started', () => {
    expect(describeRomLoadFailure(new TypeError('Failed to fetch'))).toMatch(
      /did not allow this site/,
    );
  });

  it('keeps the message from a thrown AppError', () => {
    expect(
      describeRomLoadFailure({
        kind: 'unsupported-format',
        message: 'This file is not a Game Boy ROM. The emulator was not started.',
      }),
    ).toMatch(/not a Game Boy ROM/);
  });
});
