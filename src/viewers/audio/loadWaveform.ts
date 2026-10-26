/**
 * Decode a provider audio URL into waveform peaks.
 *
 * This fetch needs CORS. Playback does not: the `<audio>` element streams without it.
 * A CORS failure here must not block listening.
 */

import { createAppError } from '../../models/errors';
import { computeWaveformPeaks } from './waveform';

export async function loadWaveformPeaks(
  url: string,
  barCount: number,
  signal: AbortSignal,
): Promise<Float32Array> {
  const response = await fetch(url, { signal, mode: 'cors', credentials: 'omit' });

  if (!response.ok) {
    throw createAppError(
      'network',
      `The audio file could not be read for a waveform (HTTP ${String(response.status)}).`,
    );
  }

  const data = await response.arrayBuffer();
  const Context =
    window.AudioContext ??
    (window as unknown as { readonly webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (typeof Context !== 'function') {
    throw createAppError(
      'unsupported-format',
      'This browser has no audio decoder to build a waveform from.',
    );
  }

  const context = new Context();

  try {
    const buffer = await context.decodeAudioData(data.slice(0));
    return computeWaveformPeaks(buffer, barCount);
  } finally {
    await context.close();
  }
}

export function describeWaveformFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : 'The waveform could not be read.';
  const lower = message.toLowerCase();
  const blocked =
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('cors') ||
    lower.includes('cross-origin') ||
    lower.includes('load failed');

  if (blocked) {
    return 'Waveform needs permission to fetch this file. Playback still uses the browser audio element and does not need that permission.';
  }

  return message;
}
