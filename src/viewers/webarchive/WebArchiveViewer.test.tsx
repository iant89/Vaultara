import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeFile, makeItem } from '../../test/fakeProvider';
import { WEB_ARCHIVE_SANDBOX } from './replay';
import { WebArchiveViewer } from './WebArchiveViewer';

const warc = makeFile({
  id: 'site.warc.gz',
  providerId: 'archive',
  itemId: 'web_stub',
  name: 'example.com-20050315120000.warc.gz',
  mimeType: 'application/warc',
  downloadUrl: 'https://archive.org/download/web_stub/site.warc.gz',
});

const item = makeItem({
  id: 'web_stub',
  providerId: 'archive',
  title: 'Example capture',
  type: 'website',
  sourceUrl: 'https://archive.org/details/web_stub',
  publicationDate: '2005-03-15',
  metadata: { originalurl: 'http://example.com/' },
});

describe('WebArchiveViewer', () => {
  it('embeds a sandboxed Wayback replay and names the capture', () => {
    render(<WebArchiveViewer item={item} files={[warc]} activeFileId="site.warc.gz" />);

    const frame = screen.getByTitle('Archived capture of Example capture');

    expect(frame.tagName).toBe('IFRAME');
    expect(frame).toHaveAttribute('sandbox', WEB_ARCHIVE_SANDBOX);
    expect(frame.getAttribute('sandbox')).not.toMatch(/same-origin/);
    expect(frame.getAttribute('sandbox')).not.toMatch(/top-navigation/);
    expect(frame).toHaveAttribute(
      'src',
      'https://web.archive.org/web/20050315120000if_/http://example.com/',
    );
    expect(frame).toHaveAttribute('referrerpolicy', 'no-referrer');
    expect(screen.getByText(/Captured 2005-03-15/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Original URL' })).toHaveAttribute(
      'href',
      'http://example.com/',
    );
    expect(screen.getByRole('link', { name: 'Open on Wayback Machine' })).toHaveAttribute(
      'href',
      'https://web.archive.org/web/20050315120000if_/http://example.com/',
    );
    expect(screen.getByText(/cannot read this app/i)).toBeInTheDocument();
  });

  it('explains a missing original URL without rendering a frame', () => {
    render(
      <WebArchiveViewer
        item={makeItem({ type: 'website', metadata: {} })}
        files={[warc]}
        activeFileId="site.warc.gz"
      />,
    );

    expect(screen.getByText(/no original URL/i)).toBeInTheDocument();
    expect(screen.queryByTitle(/Archived capture/)).not.toBeInTheDocument();
  });
});
