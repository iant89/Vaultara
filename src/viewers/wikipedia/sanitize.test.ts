import { describe, expect, it } from 'vitest';
import { sanitizeWikipediaHtml } from './sanitize';

describe('sanitizeWikipediaHtml', () => {
  it('strips scripts and javascript URLs', () => {
    const html = sanitizeWikipediaHtml(
      `<p>Safe</p><script>document.title="pwned"</script><a href="javascript:alert(1)">x</a>`,
    );

    expect(html).toContain('Safe');
    expect(html).not.toContain('script');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('pwned');
  });

  it('rewrites wiki links to in-app item routes', () => {
    const html = sanitizeWikipediaHtml(
      `<p><a href="/wiki/Charles_Babbage">Charles Babbage</a></p>`,
    );

    expect(html).toContain('href="/item/wikipedia/Charles_Babbage"');
  });

  it('keeps Wikimedia images and drops other hosts', () => {
    const html = sanitizeWikipediaHtml(
      `<img src="//upload.wikimedia.org/wikipedia/commons/a/a4/Ada.jpg" alt="Ada"><img src="https://evil.example/track.png" alt="nope">`,
    );

    expect(html).toContain('https://upload.wikimedia.org/wikipedia/commons/a/a4/Ada.jpg');
    expect(html).not.toContain('evil.example');
  });

  it('keeps heading ids so the table of contents can jump', () => {
    const html = sanitizeWikipediaHtml(`<h2 id="Biography">Biography</h2>`);

    expect(html).toContain('id="Biography"');
  });
});
