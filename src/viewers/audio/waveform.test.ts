import { describe, expect, it } from 'vitest';
import {
  WAVEFORM_MAX_BYTES,
  canFetchWaveform,
  computeWaveformPeaks,
  formatPlaybackClock,
} from './waveform';

function pcm(samples: readonly number[]): Parameters<typeof computeWaveformPeaks>[0] {
  const data = Float32Array.from(samples);
  return {
    numberOfChannels: 1,
    length: data.length,
    getChannelData: () => data,
  };
}

describe('formatPlaybackClock', () => {
  it('formats minutes and hours without inventing a placeholder', () => {
    expect(formatPlaybackClock(0)).toBe('0:00');
    expect(formatPlaybackClock(65)).toBe('1:05');
    expect(formatPlaybackClock(3723)).toBe('1:02:03');
    expect(formatPlaybackClock(Number.NaN)).toBe('0:00');
  });
});

describe('computeWaveformPeaks', () => {
  it('normalises peaks from actual samples', () => {
    const peaks = computeWaveformPeaks(pcm([0, 0.5, -1, 0.25]), 2);

    expect(peaks).toHaveLength(2);
    expect(peaks[0]).toBeCloseTo(0.5);
    expect(peaks[1]).toBeCloseTo(1);
  });

  it('returns zeros for empty PCM rather than a decorative shape', () => {
    const peaks = computeWaveformPeaks(pcm([]), 8);

    expect(peaks).toHaveLength(8);
    expect([...peaks].every((value) => value === 0)).toBe(true);
  });
});

describe('canFetchWaveform', () => {
  it('refuses unknown or huge files so listening does not download a lecture to draw bars', () => {
    expect(canFetchWaveform({ sizeBytes: 1024 })).toBe(true);
    expect(canFetchWaveform({})).toBe(false);
    expect(canFetchWaveform({ sizeBytes: WAVEFORM_MAX_BYTES + 1 })).toBe(false);
  });
});
