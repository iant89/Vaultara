import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPdfTranslator, translateLines } from './translation';

describe('translateLines', () => {
  it('keeps line boxes and replaces the text when the translator preserves lines', async () => {
    const translated = await translateLines(
      [
        { text: 'Hello', x: 1, y: 2, width: 10, height: 8, fontName: 'Times-Roman' },
        { text: 'World', x: 1, y: 12, width: 12, height: 8, fontName: 'Times-Roman' },
      ],
      {
        translate: async (text) => text.replaceAll('Hello', 'Hola').replaceAll('World', 'Mundo'),
      },
    );

    expect(translated.map((line) => line.text)).toEqual(['Hola', 'Mundo']);
    expect(translated[0]).toMatchObject({ x: 1, y: 2, width: 10, height: 8 });
  });

  it('falls back to per-line translation when the result cannot be split', async () => {
    const translated = await translateLines(
      [
        { text: 'Hello', x: 0, y: 0, width: 10, height: 8, fontName: 'Helvetica' },
        { text: 'World', x: 0, y: 10, width: 10, height: 8, fontName: 'Helvetica' },
      ],
      {
        translate: async (text) => (text.includes('\n') ? 'todo el texto' : `es:${text}`),
      },
    );

    expect(translated.map((line) => line.text)).toEqual(['es:Hello', 'es:World']);
  });
});

describe('createPdfTranslator', () => {
  afterEach(() => {
    (globalThis as { Translator?: unknown }).Translator = undefined;
  });

  it('uses the browser translator when it is available and does not call MyMemory', async () => {
    const fetchImpl = vi.fn();
    const translate = vi.fn(async (text: string) => `es:${text}`);

    (globalThis as { Translator?: unknown }).Translator = {
      availability: async () => 'available',
      create: async () => ({ translate }),
    };

    const port = await createPdfTranslator('en', 'es', { fetchImpl });

    expect(port?.source).toBe('browser');
    expect(await port?.translate('Hello')).toBe('es:Hello');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('falls back to MyMemory when the browser reports the language pair unavailable', async () => {
    const fetchImpl = vi.fn(
      async (_input: RequestInfo | URL) =>
        new Response(
          JSON.stringify({ responseStatus: 200, responseData: { translatedText: 'Hola' } }),
          {
            headers: { 'content-type': 'application/json' },
          },
        ),
    );

    (globalThis as { Translator?: unknown }).Translator = {
      availability: async () => 'unavailable',
      create: async () => {
        throw new Error('should not create a translator for an unavailable pair');
      },
    };

    const port = await createPdfTranslator('en', 'es', { fetchImpl });

    expect(port?.source).toBe('online');
    expect(await port?.translate('Hello')).toBe('Hola');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('falls back to the injected online endpoint when the browser has no translator', async () => {
    const fetchImpl = vi.fn(
      async (_input: RequestInfo | URL) =>
        new Response(
          JSON.stringify({ responseStatus: 200, responseData: { translatedText: 'Hola' } }),
          {
            headers: { 'content-type': 'application/json' },
          },
        ),
    );
    const port = await createPdfTranslator('en', 'es', { fetchImpl });

    expect(port?.source).toBe('online');
    expect(await port?.translate('Hello')).toBe('Hola');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('does not build a translator when the languages are the same', async () => {
    expect(await createPdfTranslator('en', 'en')).toBeUndefined();
  });
});
