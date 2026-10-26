/**
 * Translation for PDF text overlays.
 *
 * Primary path: Chromium's on-device Translator API when the browser provides it. Page text
 * stays in the browser. If that API is missing, MyMemory (Translated.net) is used; that path
 * needs no app secret and is disclosed in the reader. Nothing is invented when both fail.
 */

import type { PdfTextLine } from './text';

export const TRANSLATION_TARGETS: ReadonlyArray<{ readonly id: string; readonly label: string }> = [
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Spanish' },
  { id: 'fr', label: 'French' },
  { id: 'de', label: 'German' },
  { id: 'pt', label: 'Portuguese' },
  { id: 'it', label: 'Italian' },
  { id: 'zh', label: 'Chinese (Simplified)' },
  { id: 'ja', label: 'Japanese' },
  { id: 'ar', label: 'Arabic' },
];

export interface TranslatorPort {
  translate(text: string): Promise<string>;
  readonly source?: 'browser' | 'online';
}

type TranslatorAvailability = 'available' | 'downloadable' | 'downloading' | 'unavailable';

interface TranslatorConstructor {
  availability(options: {
    sourceLanguage: string;
    targetLanguage: string;
  }): Promise<TranslatorAvailability>;
  create(options: {
    sourceLanguage: string;
    targetLanguage: string;
  }): Promise<{ translate: (text: string) => Promise<string> }>;
}

export async function createPdfTranslator(
  sourceLanguage: string,
  targetLanguage: string,
  options: { readonly fetchImpl?: typeof fetch } = {},
): Promise<TranslatorPort | undefined> {
  if (sourceLanguage.trim() === targetLanguage.trim()) {
    return undefined;
  }

  const onDevice = await createBrowserTranslator(sourceLanguage, targetLanguage);

  if (onDevice !== undefined) {
    return onDevice;
  }

  const { createOnlineTranslator } = await import('./onlineTranslator');
  return createOnlineTranslator({
    sourceLanguage,
    targetLanguage,
    ...(options.fetchImpl !== undefined ? { fetchImpl: options.fetchImpl } : {}),
  });
}

export async function createBrowserTranslator(
  sourceLanguage: string,
  targetLanguage: string,
): Promise<TranslatorPort | undefined> {
  const ctor = (globalThis as { Translator?: TranslatorConstructor }).Translator;

  if (ctor === undefined) {
    return undefined;
  }

  try {
    const availability = await ctor.availability({ sourceLanguage, targetLanguage });

    if (availability === 'unavailable') {
      return undefined;
    }

    const translator = await ctor.create({ sourceLanguage, targetLanguage });

    return {
      source: 'browser',
      translate: (text) => translator.translate(text),
    };
  } catch {
    return undefined;
  }
}

export async function translateLines(
  lines: readonly PdfTextLine[],
  translator: TranslatorPort,
): Promise<readonly PdfTextLine[]> {
  if (lines.length === 0) {
    return lines;
  }

  const joined = lines.map((line) => line.text).join('\n');
  const translated = await translator.translate(joined);
  const parts = translated.split('\n');

  if (parts.length === lines.length) {
    return lines.map((line, index) => ({
      ...line,
      text: parts[index] ?? line.text,
    }));
  }

  return Promise.all(
    lines.map(async (line) => ({
      ...line,
      text: await translator.translate(line.text),
    })),
  );
}
