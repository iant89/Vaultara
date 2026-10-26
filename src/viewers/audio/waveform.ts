/**
 * Waveform peaks from decoded PCM.
 *
 * The drawing is only as honest as this input: peaks come from samples, never from a random
 * or CSS animation. Callers that cannot decode the file must not invent a shape.
 */

export interface PcmSource {
  readonly numberOfChannels: number;
  readonly length: number;
  getChannelData(channel: number): Float32Array;
}

export { formatPlaybackClock } from '../playbackClock';

/**
 * One peak per bar, max absolute amplitude across channels, then normalised to 0..1.
 *
 * Sampling inside each bar is strided so a long track does not freeze the tab.
 */
export function computeWaveformPeaks(source: PcmSource, barCount: number): Float32Array {
  const count = Math.max(1, Math.trunc(barCount));
  const peaks = new Float32Array(count);
  const length = source.length;
  const channels = Math.max(0, source.numberOfChannels);

  if (length <= 0 || channels <= 0) {
    return peaks;
  }

  const samplesPerBar = length / count;

  for (let bar = 0; bar < count; bar += 1) {
    const start = Math.floor(bar * samplesPerBar);
    const end = Math.min(length, Math.floor((bar + 1) * samplesPerBar));
    const span = Math.max(1, end - start);
    const step = Math.max(1, Math.floor(span / 64));
    let peak = 0;

    for (let channel = 0; channel < channels; channel += 1) {
      const data = source.getChannelData(channel);

      for (let sample = start; sample < end; sample += step) {
        const value = Math.abs(data[sample] ?? 0);

        if (value > peak) {
          peak = value;
        }
      }
    }

    peaks[bar] = peak;
  }

  let max = 0;

  for (const peak of peaks) {
    if (peak > max) {
      max = peak;
    }
  }

  if (max > 0) {
    for (let bar = 0; bar < peaks.length; bar += 1) {
      peaks[bar] = (peaks[bar] ?? 0) / max;
    }
  }

  return peaks;
}

/** Skip fetching a huge track solely to draw it (design spec 10.1, 17). */
export const WAVEFORM_MAX_BYTES = 12 * 1024 * 1024;

export function canFetchWaveform(file: { readonly sizeBytes?: number }): boolean {
  return file.sizeBytes !== undefined && file.sizeBytes > 0 && file.sizeBytes <= WAVEFORM_MAX_BYTES;
}
