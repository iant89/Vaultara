import { describe, expect, it } from 'vitest';
import { makeFile, makeItem } from '../../test/fakeProvider';
import {
  WEB_ARCHIVE_SANDBOX,
  buildWaybackReplayUrl,
  isWaybackReplayUrl,
  resolveWebArchiveReplay,
  timestampFromFileName,
  timestampFromValue,
} from './replay';

describe('web archive replay', () => {
  it('builds an iframe-friendly Wayback URL on web.archive.org', () => {
    const url = buildWaybackReplayUrl('http://example.com/', '20050315120000');

    expect(url).toBe('https://web.archive.org/web/20050315120000if_/http://example.com/');
    expect(isWaybackReplayUrl(url ?? '')).toBe(true);
  });

  it('rejects javascript and data original URLs', () => {
    expect(buildWaybackReplayUrl('javascript:alert(1)')).toBeUndefined();
    expect(buildWaybackReplayUrl('data:text/html,hi')).toBeUndefined();
    expect(
      resolveWebArchiveReplay(
        makeItem({
          type: 'website',
          metadata: { originalurl: 'javascript:alert(1)' },
        }),
        makeFile({ name: 'site.warc.gz' }),
      ),
    ).toBeUndefined();
  });

  it('reads a timestamp from a WARC file name', () => {
    expect(timestampFromFileName('example.com-20050315120000.warc.gz')).toBe('20050315120000');
    expect(timestampFromValue('2005-03-15')).toBe('20050315');
  });

  it('does not grant same-origin or top navigation in the sandbox', () => {
    expect(WEB_ARCHIVE_SANDBOX).toContain('allow-scripts');
    expect(WEB_ARCHIVE_SANDBOX).not.toContain('same-origin');
    expect(WEB_ARCHIVE_SANDBOX).not.toContain('top-navigation');
  });
});
