import { describe, expect, it } from 'vitest';
import { describeWaveformFailure } from './loadWaveform';

describe('describeWaveformFailure', () => {
  it('explains a CORS block without claiming playback is broken', () => {
    expect(describeWaveformFailure(new TypeError('Failed to fetch'))).toMatch(
      /Waveform needs permission to fetch this file/i,
    );
    expect(describeWaveformFailure(new TypeError('Failed to fetch'))).toMatch(/Playback still/i);
  });

  it('keeps other decoder errors as written', () => {
    expect(describeWaveformFailure(new Error('Unable to decode audio data'))).toBe(
      'Unable to decode audio data',
    );
  });
});
