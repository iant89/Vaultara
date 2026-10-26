import { describe, expect, it } from 'vitest';
import { buildStoredZip, unzip } from './zip';

describe('stored zip', () => {
  it('round-trips entries and rejects path traversal names', async () => {
    const archive = buildStoredZip({
      'META-INF/container.xml': '<container/>',
      'OEBPS/c1.xhtml': '<p>Hello</p>',
    });
    const files = await unzip(archive);

    expect(new TextDecoder().decode(files.get('META-INF/container.xml'))).toBe('<container/>');
    expect(new TextDecoder().decode(files.get('OEBPS/c1.xhtml'))).toBe('<p>Hello</p>');
  });

  it('skips path traversal names instead of extracting them', async () => {
    const files = await unzip(
      buildStoredZip({
        '../secret.txt': 'nope',
        'OEBPS/ok.txt': 'yes',
      }),
    );

    expect(files.has('../secret.txt')).toBe(false);
    expect(new TextDecoder().decode(files.get('OEBPS/ok.txt'))).toBe('yes');
  });
});
