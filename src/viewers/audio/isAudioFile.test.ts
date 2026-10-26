import { describe, expect, it } from 'vitest';
import { canPlayAudio, isAudioDerivative, isAudioFile } from './isAudioFile';

function file(
  overrides: Partial<Parameters<typeof isAudioFile>[0]> = {},
): Parameters<typeof isAudioFile>[0] {
  return {
    name: 'track.mp3',
    downloadAvailable: true,
    downloadUrl: 'https://archive.org/download/album/track.mp3',
    ...overrides,
  };
}

describe('isAudioFile', () => {
  it('accepts MP3, Ogg, WAV, FLAC, M4A, and AAC by MIME, extension, or name', () => {
    expect(isAudioFile(file({ mimeType: 'audio/mpeg', name: 'take' }))).toBe(true);
    expect(isAudioFile(file({ mimeType: undefined, extension: 'ogg', name: 'take' }))).toBe(true);
    expect(isAudioFile(file({ mimeType: undefined, extension: undefined, name: 'Take.WAV' }))).toBe(
      true,
    );
    expect(isAudioFile(file({ mimeType: 'audio/flac', name: 'take.flac' }))).toBe(true);
    expect(isAudioFile(file({ mimeType: 'audio/mp4', extension: 'm4a', name: 'take.m4a' }))).toBe(
      true,
    );
    expect(isAudioFile(file({ mimeType: 'audio/aac', extension: 'aac', name: 'take.aac' }))).toBe(
      true,
    );
  });

  it('rejects video, MIDI, and documents', () => {
    expect(isAudioFile(file({ name: 'clip.mp4', mimeType: 'video/mp4', extension: 'mp4' }))).toBe(
      false,
    );
    expect(isAudioFile(file({ name: 'tune.mid', mimeType: 'audio/midi', extension: 'mid' }))).toBe(
      false,
    );
    expect(
      isAudioFile(file({ name: 'notes.pdf', mimeType: 'application/pdf', extension: 'pdf' })),
    ).toBe(false);
  });
});

describe('isAudioDerivative', () => {
  it('recognises Archive 64kbps and Ogg Vorbis derivatives', () => {
    expect(isAudioDerivative(file({ metadata: { format: '64Kbps MP3' } }))).toBe(true);
    expect(isAudioDerivative(file({ metadata: { format: 'Ogg Vorbis' } }))).toBe(true);
    expect(isAudioDerivative(file({ metadata: { format: 'VBR MP3' } }))).toBe(false);
  });
});

describe('canPlayAudio', () => {
  it('requires a downloadable URL', () => {
    expect(canPlayAudio(file())).toBe(true);
    expect(canPlayAudio(file({ downloadAvailable: false, downloadUrl: undefined }))).toBe(false);
    expect(canPlayAudio(file({ downloadUrl: undefined }))).toBe(false);
  });
});
