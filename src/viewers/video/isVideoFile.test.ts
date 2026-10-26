import { describe, expect, it } from 'vitest';
import {
  canPlayVideo,
  canUseCaption,
  isVideoDerivative,
  isVideoFile,
  isVttCaption,
} from './isVideoFile';

function file(
  overrides: Partial<Parameters<typeof isVideoFile>[0]> = {},
): Parameters<typeof isVideoFile>[0] {
  return {
    name: 'clip.mp4',
    downloadAvailable: true,
    downloadUrl: 'https://archive.org/download/film/clip.mp4',
    ...overrides,
  };
}

describe('isVideoFile', () => {
  it('accepts MP4, WebM, and Ogg video by MIME, extension, or name', () => {
    expect(isVideoFile(file({ mimeType: 'video/mp4', name: 'take' }))).toBe(true);
    expect(isVideoFile(file({ mimeType: undefined, extension: 'webm', name: 'take' }))).toBe(true);
    expect(isVideoFile(file({ mimeType: undefined, extension: undefined, name: 'Take.OGV' }))).toBe(
      true,
    );
  });

  it('rejects audio, MPEG-2, MKV, and documents', () => {
    expect(isVideoFile(file({ name: 'track.m4a', mimeType: 'audio/mp4', extension: 'm4a' }))).toBe(
      false,
    );
    expect(isVideoFile(file({ name: 'clip.mpg', mimeType: 'video/mpeg', extension: 'mpg' }))).toBe(
      false,
    );
    expect(
      isVideoFile(file({ name: 'clip.mkv', mimeType: 'video/x-matroska', extension: 'mkv' })),
    ).toBe(false);
    expect(
      isVideoFile(file({ name: 'clip.avi', mimeType: 'video/x-msvideo', extension: 'avi' })),
    ).toBe(false);
    expect(
      isVideoFile(file({ name: 'notes.pdf', mimeType: 'application/pdf', extension: 'pdf' })),
    ).toBe(false);
  });
});

describe('isVideoDerivative', () => {
  it('recognises Archive 512kb MPEG4 and Ogg Video derivatives', () => {
    expect(isVideoDerivative(file({ metadata: { format: '512Kb MPEG4' } }))).toBe(true);
    expect(isVideoDerivative(file({ metadata: { format: 'Ogg Video' } }))).toBe(true);
    expect(isVideoDerivative(file({ metadata: { format: 'h.264 IA' } }))).toBe(false);
  });
});

describe('canPlayVideo', () => {
  it('requires a downloadable URL', () => {
    expect(canPlayVideo(file())).toBe(true);
    expect(canPlayVideo(file({ downloadAvailable: false, downloadUrl: undefined }))).toBe(false);
    expect(canPlayVideo(file({ downloadUrl: undefined }))).toBe(false);
  });
});

describe('captions', () => {
  it('accepts WebVTT and rejects SRT', () => {
    expect(
      isVttCaption(file({ name: 'english.vtt', mimeType: 'text/vtt', extension: 'vtt' })),
    ).toBe(true);
    expect(isVttCaption(file({ name: 'english.srt', mimeType: 'application/x-subrip' }))).toBe(
      false,
    );
    expect(
      canUseCaption(
        file({
          name: 'english.vtt',
          mimeType: 'text/vtt',
          downloadUrl: 'https://archive.org/download/film/english.vtt',
        }),
      ),
    ).toBe(true);
  });
});
