/**
 * Fallback translation via MyMemory (Translated.net) when the browser has no Translator API.
 *
 * GitHub Pages has no backend, so a secret-keyed Google/DeepL client cannot live in this app.
 * MyMemory accepts CORS requests without a key, with a 500-byte payload cap and an anonymous
 * daily quota. Page text leaves the browser; that is disclosed in the reader, not hidden.
 *
 * Tests inject `fetchImpl`. Application code never calls this module during unit tests without
 * one — the live host is not a fixture.
 */

import type { TranslatorPort } from './translation';

export const MYMEMORY_ENDPOINT = 'https://api.mymemory.translated.net/get';

/** Stay under MyMemory's documented 500-byte `q` limit. */
export const MYMEMORY_MAX_QUERY_BYTES = 450;

export interface OnlineTranslatorOptions {
  readonly sourceLanguage: string;
  readonly targetLanguage: string;
  readonly fetchImpl?: typeof fetch;
  readonly endpoint?: string;
}

const LANGUAGE_ALIASES: Readonly<Record<string, string>> = {
  zh: 'zh-CN',
};

export function toMyMemoryLanguage(code: string): string {
  const trimmed = code.trim();
  return LANGUAGE_ALIASES[trimmed] ?? trimmed;
}

export function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function splitTranslationPayload(
  text: string,
  maxBytes = MYMEMORY_MAX_QUERY_BYTES,
): readonly string[] {
  if (utf8ByteLength(text) <= maxBytes) {
    return [text];
  }

  const chunks: string[] = [];
  let current = '';

  for (const line of text.split('\n')) {
    if (utf8ByteLength(line) > maxBytes) {
      if (current.length > 0) {
        chunks.push(current);
        current = '';
      }

      chunks.push(...splitHard(line, maxBytes));
      continue;
    }

    const next = current.length === 0 ? line : `${current}\n${line}`;

    if (utf8ByteLength(next) > maxBytes) {
      chunks.push(current);
      current = line;
    } else {
      current = next;
    }
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks.length > 0 ? chunks : [''];
}

function splitHard(text: string, maxBytes: number): readonly string[] {
  const chunks: string[] = [];
  let current = '';

  for (const character of text) {
    const next = `${current}${character}`;

    if (utf8ByteLength(next) > maxBytes) {
      if (current.length > 0) {
        chunks.push(current);
      }

      current = character;
    } else {
      current = next;
    }
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

export function createOnlineTranslator(options: OnlineTranslatorOptions): TranslatorPort {
  const source = toMyMemoryLanguage(options.sourceLanguage);
  const target = toMyMemoryLanguage(options.targetLanguage);
  const endpoint = options.endpoint ?? MYMEMORY_ENDPOINT;
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    source: 'online',
    async translate(text) {
      if (text.trim().length === 0) {
        return text;
      }

      const parts = splitTranslationPayload(text);
      const translated: string[] = [];

      for (const part of parts) {
        translated.push(await translateOnce(fetchImpl, endpoint, source, target, part));
      }

      return translated.join('\n');
    },
  };
}

async function translateOnce(
  fetchImpl: typeof fetch,
  endpoint: string,
  source: string,
  target: string,
  text: string,
): Promise<string> {
  const url = new URL(endpoint);
  url.searchParams.set('q', text);
  url.searchParams.set('langpair', `${source}|${target}`);
  url.searchParams.set('mt', '1');

  let response: Response;

  try {
    response = await fetchImpl(url, { method: 'GET', mode: 'cors' });
  } catch {
    throw new Error(
      'The translation service could not be reached. Check your connection and try again.',
    );
  }

  if (!response.ok) {
    throw new Error(
      `The translation service refused the request (HTTP ${String(response.status)}).`,
    );
  }

  const payload: unknown = await response.json();
  return readTranslatedText(payload);
}

function readTranslatedText(payload: unknown): string {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('The translation service returned data that could not be understood.');
  }

  const record = payload as Record<string, unknown>;

  if (record['quotaFinished'] === true) {
    throw new Error(
      "The translation service's free daily limit has been reached. Try again tomorrow.",
    );
  }

  const status = record['responseStatus'];
  const numericStatus = typeof status === 'number' ? status : Number(status);

  if (numericStatus !== 200) {
    const details =
      typeof record['responseDetails'] === 'string' && record['responseDetails'].trim().length > 0
        ? record['responseDetails'].trim()
        : 'The translation service could not translate this page.';
    throw new Error(details);
  }

  const data = record['responseData'];

  if (typeof data !== 'object' || data === null) {
    throw new Error('The translation service returned data that could not be understood.');
  }

  const translated = (data as Record<string, unknown>)['translatedText'];

  if (typeof translated !== 'string') {
    throw new Error('The translation service returned data that could not be understood.');
  }

  if (translated.toUpperCase().includes('MYMEMORY WARNING')) {
    throw new Error(
      "The translation service's free daily limit has been reached. Try again tomorrow.",
    );
  }

  return translated;
}
