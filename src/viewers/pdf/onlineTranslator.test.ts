import { describe, expect, it, vi } from 'vitest';
import {
  createOnlineTranslator,
  MYMEMORY_ENDPOINT,
  splitTranslationPayload,
  toMyMemoryLanguage,
  utf8ByteLength,
} from './onlineTranslator';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('toMyMemoryLanguage', () => {
  it('maps simplified Chinese to the code MyMemory documents', () => {
    expect(toMyMemoryLanguage('zh')).toBe('zh-CN');
    expect(toMyMemoryLanguage('es')).toBe('es');
  });
});

describe('splitTranslationPayload', () => {
  it('keeps short text in one request', () => {
    expect(splitTranslationPayload('Hello world')).toEqual(['Hello world']);
  });

  it('splits on newlines before the byte cap', () => {
    const chunks = splitTranslationPayload('aaaa\nbbbb\ncccc', 8);

    expect(chunks.every((chunk) => utf8ByteLength(chunk) <= 8)).toBe(true);
    expect(chunks.join('\n')).toBe('aaaa\nbbbb\ncccc');
  });
});

describe('createOnlineTranslator', () => {
  it('reads the translated sentence from a successful MyMemory payload', async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL) =>
      jsonResponse({
        responseStatus: 200,
        responseData: { translatedText: 'Hola' },
      }),
    );
    const translator = createOnlineTranslator({
      sourceLanguage: 'en',
      targetLanguage: 'es',
      fetchImpl,
    });

    expect(await translator.translate('Hello')).toBe('Hola');
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const request = fetchImpl.mock.calls[0]?.[0];
    expect(request).toBeInstanceOf(URL);

    const url = request as URL;
    expect(url.origin + url.pathname).toBe(MYMEMORY_ENDPOINT);
    expect(url.searchParams.get('q')).toBe('Hello');
    expect(url.searchParams.get('langpair')).toBe('en|es');
  });

  it('does not invent a translation when the quota is finished', async () => {
    const translator = createOnlineTranslator({
      sourceLanguage: 'en',
      targetLanguage: 'fr',
      fetchImpl: async () =>
        jsonResponse({
          responseStatus: 200,
          quotaFinished: true,
          responseData: { translatedText: 'Bonjour' },
        }),
    });

    await expect(translator.translate('Hello')).rejects.toThrow(/daily limit/i);
  });

  it('rejects MyMemory warning strings instead of painting them on the page', async () => {
    const translator = createOnlineTranslator({
      sourceLanguage: 'en',
      targetLanguage: 'de',
      fetchImpl: async () =>
        jsonResponse({
          responseStatus: 200,
          responseData: {
            translatedText: 'MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY',
          },
        }),
    });

    await expect(translator.translate('Hello')).rejects.toThrow(/daily limit/i);
  });

  it('explains a network failure without claiming a translation', async () => {
    const translator = createOnlineTranslator({
      sourceLanguage: 'en',
      targetLanguage: 'it',
      fetchImpl: async () => {
        throw new TypeError('Failed to fetch');
      },
    });

    await expect(translator.translate('Hello')).rejects.toThrow(/could not be reached/i);
  });
});
