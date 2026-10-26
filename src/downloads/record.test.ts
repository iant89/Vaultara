import { describe, expect, it } from 'vitest';
import { buildDownloadRecord } from './record';

describe('buildDownloadRecord', () => {
  it('records an opened attempt when the URL is safe', () => {
    const record = buildDownloadRecord(
      {
        itemTitle: 'Night of the Living Dead',
        file: {
          providerId: 'archive',
          itemId: 'night_of_the_living_dead',
          id: 'night.mp4',
          name: 'night.mp4',
          mimeType: 'video/mp4',
          sizeBytes: 12,
          downloadAvailable: true,
          downloadUrl: 'https://archive.org/download/night_of_the_living_dead/night.mp4',
        },
      },
      () => '2026-10-26T12:00:00.000Z',
    );

    expect(record.status).toBe('opened');
    expect(record.detail).toBeUndefined();
    expect(record.downloadUrl).toBe(
      'https://archive.org/download/night_of_the_living_dead/night.mp4',
    );
    expect(record.startedAt).toBe('2026-10-26T12:00:00.000Z');
  });

  it('records unavailable without storing an unsafe URL', () => {
    const record = buildDownloadRecord({
      itemTitle: 'Restricted scan',
      file: {
        providerId: 'archive',
        itemId: 'scan',
        id: 'scan.pdf',
        name: 'scan.pdf',
        downloadAvailable: false,
        accessStatus: 'lending-restricted',
        downloadUrl: 'javascript:alert(1)',
      },
    });

    expect(record.status).toBe('unavailable');
    expect(record.downloadUrl).toBeUndefined();
    expect(record.detail).toMatch(/borrowing/i);
  });
});
