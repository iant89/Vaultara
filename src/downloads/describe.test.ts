import { describe, expect, it } from 'vitest';
import {
  canOfferDownload,
  describeDownloadRestriction,
  describeDownloadStatus,
  describeViewerCompatibility,
  isSafeDownloadUrl,
} from './describe';

describe('isSafeDownloadUrl', () => {
  it('accepts http and https URLs', () => {
    expect(isSafeDownloadUrl('https://archive.org/download/night/night.mp4')).toBe(true);
    expect(isSafeDownloadUrl('http://example.org/file.pdf')).toBe(true);
  });

  it('rejects non-http schemes and unparseable values', () => {
    expect(isSafeDownloadUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeDownloadUrl('data:text/html,hi')).toBe(false);
    expect(isSafeDownloadUrl('ftp://files.example/a.bin')).toBe(false);
    expect(isSafeDownloadUrl('/relative/path.pdf')).toBe(false);
    expect(isSafeDownloadUrl('')).toBe(false);
    expect(isSafeDownloadUrl(undefined)).toBe(false);
  });
});

describe('canOfferDownload', () => {
  it('requires a permitted file and a safe URL', () => {
    expect(
      canOfferDownload({
        name: 'night.mp4',
        downloadAvailable: true,
        downloadUrl: 'https://archive.org/download/night/night.mp4',
      }),
    ).toBe(true);
    expect(
      canOfferDownload({
        name: 'night.mp4',
        downloadAvailable: false,
        downloadUrl: 'https://archive.org/download/night/night.mp4',
      }),
    ).toBe(false);
    expect(
      canOfferDownload({
        name: 'night.mp4',
        downloadAvailable: true,
        downloadUrl: 'javascript:alert(1)',
      }),
    ).toBe(false);
  });
});

describe('describeDownloadRestriction', () => {
  it('explains lending and provider restrictions', () => {
    expect(
      describeDownloadRestriction({
        name: 'book.pdf',
        downloadAvailable: false,
        accessStatus: 'lending-restricted',
      }),
    ).toMatch(/borrowing/i);
    expect(
      describeDownloadRestriction({
        name: 'scan.pdf',
        downloadAvailable: false,
        accessStatus: 'download-restricted',
      }),
    ).toMatch(/restricted/i);
  });

  it('rejects an unsafe URL even when the provider flagged the file as downloadable', () => {
    expect(
      describeDownloadRestriction({
        name: 'payload.html',
        downloadAvailable: true,
        downloadUrl: 'javascript:alert(1)',
      }),
    ).toMatch(/http\(s\)/i);
  });
});

describe('describeViewerCompatibility', () => {
  it('distinguishes PDFs this app can read from everything else', () => {
    expect(
      describeViewerCompatibility({
        name: 'notes.pdf',
        mimeType: 'application/pdf',
        downloadAvailable: true,
        downloadUrl: 'https://archive.org/download/alice/notes.pdf',
      }),
    ).toBe('In-app reader');
    expect(
      describeViewerCompatibility({
        name: 'night.mp4',
        mimeType: 'video/mp4',
        downloadAvailable: true,
        downloadUrl: 'https://archive.org/download/night/night.mp4',
      }),
    ).toBe('No in-app viewer');
    expect(
      describeViewerCompatibility({
        name: 'still.jpg',
        mimeType: 'image/jpeg',
        downloadAvailable: true,
        downloadUrl: 'https://archive.org/download/photos/still.jpg',
      }),
    ).toBe('In-app gallery');
    expect(
      describeViewerCompatibility({
        name: 'theme.wav',
        mimeType: 'audio/wav',
        downloadAvailable: true,
        downloadUrl: 'https://archive.org/download/album/theme.wav',
      }),
    ).toBe('In-app player');
  });
});

describe('describeDownloadStatus', () => {
  it('never claims the file arrived', () => {
    expect(describeDownloadStatus({ status: 'opened' })).toMatch(/cannot confirm/i);
    expect(describeDownloadStatus({ status: 'unavailable', detail: 'Not downloadable' })).toBe(
      'Not downloadable',
    );
  });
});
