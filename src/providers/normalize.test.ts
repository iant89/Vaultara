import { describe, expect, it } from 'vitest';
import type { AppError } from '../models/errors';
import {
  normalizeCategories,
  normalizeContentCategory,
  normalizeContentCollection,
  normalizeContentFile,
  normalizeContentItem,
  normalizeContentType,
  normalizeDescription,
  normalizeMetadata,
  normalizeProviderId,
  normalizePublicationDate,
  normalizeStringList,
  normalizeTags,
  normalizeText,
  normalizeUrl,
} from './normalize';

/** Assert a builder rejected a payload with the provider-facing error kind. */
function expectInvalidResponse(run: () => unknown): void {
  try {
    run();
  } catch (error) {
    expect((error as AppError).kind).toBe('invalid-response');
    return;
  }

  throw new Error('Expected the normalizer to reject the payload.');
}

describe('normalizeText', () => {
  it('trims and collapses internal whitespace', () => {
    expect(normalizeText('  Nosferatu,   eine \n Symphonie  ')).toBe('Nosferatu, eine Symphonie');
  });

  it('removes control characters that would corrupt layout', () => {
    expect(normalizeText('a\u0000b\u0007c\u007f')).toBe('a b c');
  });

  it('returns an empty string for non-string input', () => {
    expect(normalizeText(undefined)).toBe('');
    expect(normalizeText(42)).toBe('');
    expect(normalizeText({ text: 'no' })).toBe('');
  });
});

describe('normalizeDescription', () => {
  it('keeps paragraph breaks instead of flattening prose', () => {
    expect(normalizeDescription('First line.\n\nSecond paragraph.')).toBe(
      'First line.\n\nSecond paragraph.',
    );
  });

  it('collapses runs of blank lines', () => {
    expect(normalizeDescription('One.\n\n\n\n\nTwo.')).toBe('One.\n\nTwo.');
  });

  it('returns undefined when there is nothing to show', () => {
    expect(normalizeDescription('   \n  ')).toBeUndefined();
    expect(normalizeDescription(null)).toBeUndefined();
  });
});

describe('normalizeContentType', () => {
  it.each([
    ['movie', 'movie'],
    ['Films', 'movie'],
    ['texts', 'document'],
    ['still image', 'image'],
    ['SOUND', 'audio'],
    ['web sites', 'website'],
  ])('maps %s to %s', (input, expected) => {
    expect(normalizeContentType(input)).toBe(expected);
  });

  it('falls back to unknown rather than dropping unrecognized media', () => {
    expect(normalizeContentType('hologram')).toBe('unknown');
    expect(normalizeContentType('')).toBe('unknown');
    expect(normalizeContentType(undefined)).toBe('unknown');
  });
});

describe('normalizeUrl', () => {
  it('keeps absolute http and https URLs', () => {
    expect(normalizeUrl('https://archive.org/thumb.jpg')).toBe('https://archive.org/thumb.jpg');
    expect(normalizeUrl('http://example.com/a b')).toBe('http://example.com/a%20b');
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=',
    'file:///etc/passwd',
    'mailto:someone@example.com',
  ])('drops the unsafe URL %s', (url) => {
    expect(normalizeUrl(url)).toBeUndefined();
  });

  it('drops unparseable values', () => {
    expect(normalizeUrl('not a url')).toBeUndefined();
    expect(normalizeUrl('')).toBeUndefined();
    expect(normalizeUrl(undefined)).toBeUndefined();
  });

  it('resolves relative references against a base when given one', () => {
    expect(normalizeUrl('/thumb.jpg', 'https://archive.org')).toBe('https://archive.org/thumb.jpg');
  });
});

describe('normalizeStringList', () => {
  it('trims, de-duplicates case-insensitively, and drops blanks', () => {
    expect(normalizeStringList(['  Sci-Fi ', 'sci-fi', '', 'Horror'])).toEqual([
      'Sci-Fi',
      'Horror',
    ]);
  });

  it('treats a single string as a one-element list rather than splitting it', () => {
    expect(normalizeStringList('Gothic, Horror')).toEqual(['Gothic, Horror']);
  });

  it('bounds the number of entries', () => {
    const many = Array.from({ length: 100 }, (_, index) => `tag-${index}`);

    expect(normalizeStringList(many, { maxItems: 5 })).toHaveLength(5);
  });

  it('bounds the length of each entry', () => {
    expect(normalizeStringList(['abcdefgh'], { maxLength: 3 })).toEqual(['abc']);
  });

  it('ignores non-string entries', () => {
    expect(normalizeStringList([1, null, { a: 1 }, 'kept'])).toEqual(['kept']);
  });

  it('applies tighter limits to categories than to tags', () => {
    const long = Array.from({ length: 60 }, (_, index) => `category-${index}`);

    expect(normalizeCategories(long).length).toBeLessThan(normalizeTags(long).length);
  });
});

describe('normalizePublicationDate', () => {
  it.each([
    ['1922', '1922'],
    ['1922-03', '1922-03'],
    ['1922-03-14', '1922-03-14'],
    ['1922-03-14T00:00:00Z', '1922-03-14'],
  ])('reduces %s to %s', (input, expected) => {
    expect(normalizePublicationDate(input)).toBe(expected);
  });

  it.each(['circa 1922', 'unknown', '1922-13-01', '1922-03-32', '', '22-03-14'])(
    'drops the unusable date %s',
    (input) => {
      expect(normalizePublicationDate(input)).toBeUndefined();
    },
  );
});

describe('normalizeMetadata', () => {
  it('preserves provider-specific detail verbatim', () => {
    expect(normalizeMetadata({ identifier: 'nosferatu', collection: ['film', 'gothic'] })).toEqual({
      identifier: 'nosferatu',
      collection: ['film', 'gothic'],
    });
  });

  it('skips keys that would mutate a prototype', () => {
    const payload = JSON.parse('{"safe": 1, "__proto__": {"polluted": true}}') as Record<
      string,
      unknown
    >;

    const metadata = normalizeMetadata(payload);

    expect(Object.keys(metadata)).toEqual(['safe']);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });

  it('returns a frozen empty object for non-objects', () => {
    expect(normalizeMetadata('nope')).toEqual({});
    expect(Object.isFrozen(normalizeMetadata(null))).toBe(true);
  });

  it('bounds the number of keys', () => {
    const wide = Object.fromEntries(
      Array.from({ length: 50 }, (_, index) => [`key-${index}`, index]),
    );

    expect(Object.keys(normalizeMetadata(wide, { maxKeys: 3 }))).toHaveLength(3);
  });
});

describe('normalizeProviderId', () => {
  it('lowercases and trims a valid id', () => {
    expect(normalizeProviderId('  Archive ')).toBe('archive');
  });

  it.each(['Archive Org', 'archive_org', '', 'archive/org'])('rejects %s', (value) => {
    expect(() => normalizeProviderId(value)).toThrow(TypeError);
  });
});

describe('normalizeContentItem', () => {
  it('builds a complete item from a well-formed payload', () => {
    const item = normalizeContentItem(
      {
        id: 'nosferatu',
        title: '  Nosferatu ',
        description: 'A silent film.\n\nRestored.',
        mediatype: 'movies',
        creator: 'F. W. Murnau',
        date: '1922-03-04',
        thumbnail: 'https://archive.org/thumb.jpg',
        url: 'https://archive.org/details/nosferatu',
        categories: ['Film', 'film'],
        tags: ['gothic'],
        metadata: { identifier: 'nosferatu' },
      },
      'archive',
    );

    expect(item).toMatchObject({
      id: 'nosferatu',
      providerId: 'archive',
      title: 'Nosferatu',
      type: 'movie',
      creator: 'F. W. Murnau',
      publicationDate: '1922-03-04',
      thumbnailUrl: 'https://archive.org/thumb.jpg',
      sourceUrl: 'https://archive.org/details/nosferatu',
      categories: ['Film'],
      tags: ['gothic'],
      metadata: { identifier: 'nosferatu' },
    });
    expect(item.description).toBe('A silent film.\n\nRestored.');
  });

  it('falls back to the id when a title is missing, rather than dropping the item', () => {
    expect(normalizeContentItem({ id: 'untitled-thing' }, 'archive').title).toBe('untitled-thing');
  });

  it('drops an unsafe thumbnail instead of rendering it', () => {
    const item = normalizeContentItem({ id: 'x', thumbnail: 'javascript:alert(1)' }, 'archive');

    expect(item.thumbnailUrl).toBeUndefined();
  });

  it('defaults the content type to unknown', () => {
    expect(normalizeContentItem({ id: 'x' }, 'archive').type).toBe('unknown');
  });

  it('rejects a payload that is not an object', () => {
    expectInvalidResponse(() => normalizeContentItem('nope', 'archive'));
  });

  it('rejects a payload with no id', () => {
    expectInvalidResponse(() => normalizeContentItem({ title: 'No id' }, 'archive'));
  });

  it('rejects an item that claims a different provider', () => {
    expectInvalidResponse(() =>
      normalizeContentItem({ id: 'x', providerId: 'wikipedia' }, 'archive'),
    );
  });

  it('accepts an item that restates its own provider', () => {
    expect(normalizeContentItem({ id: 'x', providerId: 'archive' }, 'archive').providerId).toBe(
      'archive',
    );
  });
});

describe('normalizeContentCollection', () => {
  it('truncates a fractional item count and drops a negative one', () => {
    expect(normalizeContentCollection({ id: 'c', itemCount: 12.7 }, 'archive').itemCount).toBe(12);
    expect(
      normalizeContentCollection({ id: 'c', itemCount: -4 }, 'archive').itemCount,
    ).toBeUndefined();
  });

  it('rejects a collection with no id', () => {
    expectInvalidResponse(() => normalizeContentCollection({ title: 'No id' }, 'archive'));
  });
});

describe('normalizeContentFile', () => {
  it('assumes a file is neither viewable nor downloadable unless stated', () => {
    const file = normalizeContentFile({ name: 'scan.pdf' }, 'archive', 'item-1');

    expect(file).toMatchObject({
      id: 'scan.pdf',
      name: 'scan.pdf',
      itemId: 'item-1',
      downloadAvailable: false,
      viewable: false,
    });
  });

  it('keeps explicitly permitted flags', () => {
    const file = normalizeContentFile(
      { name: 'scan.pdf', downloadAvailable: true, viewable: true, size: 2048.9 },
      'archive',
      'item-1',
    );

    expect(file.downloadAvailable).toBe(true);
    expect(file.viewable).toBe(true);
    expect(file.sizeBytes).toBe(2048);
  });

  it('rejects a file payload with no name or id', () => {
    expectInvalidResponse(() => normalizeContentFile({}, 'archive', 'item-1'));
  });
});

describe('normalizeContentCategory', () => {
  it('falls back to the id for a missing name', () => {
    expect(normalizeContentCategory({ id: 'texts' }).name).toBe('texts');
  });

  it('attributes the category to the provider when one is given', () => {
    expect(normalizeContentCategory({ id: 'texts' }, 'archive').providerId).toBe('archive');
  });

  it('rejects a category with no id', () => {
    expectInvalidResponse(() => normalizeContentCategory({ name: 'Nameless' }));
  });
});
