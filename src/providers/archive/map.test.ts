import { describe, expect, it } from 'vitest';
import {
  ARCHIVE_PROVIDER_ID,
  isArchiveCollection,
  mapCollection,
  mapFiles,
  mapItem,
  parseByteSize,
  parseChecksum,
  readItemAccess,
  resolvePublicationDate,
  stripHtml,
} from './map';
import {
  isBrowserDisplayable,
  mapMediatype,
  resolveFileExtension,
  resolveMimeType,
} from './taxonomy';
import {
  COLLECTION_METADATA_RESPONSE,
  ITEM_RESPONSE,
  LENDING_RESPONSE,
  SEARCH_RESPONSE,
} from './fixtures';

const urls = {
  detailsUrl: (identifier: string) => `https://archive.org/details/${identifier}`,
  thumbnailUrl: (identifier: string) => `https://archive.org/services/img/${identifier}`,
  downloadUrl: (identifier: string, fileName: string) =>
    `https://archive.org/download/${identifier}/${fileName}`,
};

/** First search document, as the adapter would pass it to `mapItem`. */
const searchDoc = SEARCH_RESPONSE.response.docs[0];
const textDoc = SEARCH_RESPONSE.response.docs[1];

if (searchDoc === undefined || textDoc === undefined) {
  throw new Error('Fixtures are missing search documents.');
}

function publicAccess() {
  return { dark: false, noDownload: false, lending: false };
}

describe('taxonomy', () => {
  it.each([
    ['texts', 'document'],
    ['movies', 'movie'],
    ['audio', 'audio'],
    ['etree', 'music'],
    ['image', 'image'],
    ['software', 'software'],
    ['data', 'software'],
    ['web', 'website'],
    ['collection', 'collection'],
    ['tour', 'unknown'],
  ] as const)('maps mediatype %s to %s', (mediatype, expected) => {
    expect(mapMediatype(mediatype)).toBe(expected);
  });

  it('treats an absent or unrecognized mediatype as unknown', () => {
    expect(mapMediatype(undefined)).toBe('unknown');
    expect(mapMediatype('  ')).toBe('unknown');
    expect(mapMediatype('hologram')).toBe('unknown');
  });

  it('prefers the format label over the extension', () => {
    // Both are `.jpg`; only the label distinguishes a stubbed thumbnail from a scan.
    expect(resolveMimeType('JPEG Thumb', 'thumb.jpg')).toBe('image/jpeg');
    expect(resolveMimeType('Text PDF', 'book.pdf')).toBe('application/pdf');
    expect(resolveMimeType('VBR MP3', 'track.mp3')).toBe('audio/mpeg');
    expect(resolveMimeType('h.264 IA', 'film.mp4')).toBe('video/mp4');
  });

  it('falls back to the extension for an unknown format label', () => {
    expect(resolveMimeType('Mathematica Notebook', 'notebook.nb')).toBeUndefined();
    expect(resolveMimeType('Something New', 'letter.txt')).toBe('text/plain');
    expect(resolveMimeType(undefined, 'archive.zip')).toBe('application/zip');
  });

  it('reports nothing for a file without a usable extension', () => {
    expect(resolveFileExtension('README')).toBeUndefined();
    expect(resolveFileExtension('.hidden')).toBeUndefined();
    expect(resolveFileExtension('trailing.')).toBeUndefined();
    expect(resolveFileExtension('SCAN.JPG')).toBe('jpg');
  });

  it('only treats browser-native media as viewable', () => {
    expect(isBrowserDisplayable('image/jpeg')).toBe(true);
    expect(isBrowserDisplayable('audio/mpeg')).toBe(true);
    // A PDF needs a viewer that does not exist yet (roadmap Phase 8).
    expect(isBrowserDisplayable('application/pdf')).toBe(false);
    expect(isBrowserDisplayable(undefined)).toBe(false);
  });
});

describe('stripHtml', () => {
  it('keeps paragraph structure and drops inline markup without inventing spaces', () => {
    expect(
      stripHtml('<p>An unauthorized adaptation of <i>Dracula</i>.<br />Restored print.</p>'),
    ).toBe('An unauthorized adaptation of Dracula.\nRestored print.');
  });

  it('decodes entities so text is not shown as markup escapes', () => {
    expect(stripHtml('Tom &amp; Jerry &lt;1940&gt; &quot;classic&quot;')).toBe(
      'Tom & Jerry <1940> "classic"',
    );
    expect(stripHtml('caf&#233; &#x2014; bar')).toBe('café — bar');
  });

  it('leaves unknown entities alone rather than mangling them', () => {
    expect(stripHtml('100&bogus; 5 & 6')).toBe('100&bogus; 5 & 6');
  });

  it('drops script and style content, not just their tags', () => {
    // Removed blocks become a space so surrounding words are not fused together.
    expect(stripHtml('Before<script>alert(1)</script>After')).toBe('Before After');
    expect(stripHtml('Before<style>p { color: red; }</style>After')).toBe('Before After');
  });

  it('returns undefined for empty or non-text descriptions', () => {
    expect(stripHtml('')).toBeUndefined();
    expect(stripHtml('   ')).toBeUndefined();
    expect(stripHtml(undefined)).toBeUndefined();
    expect(stripHtml(42)).toBeUndefined();
  });
});

describe('field conversion', () => {
  it.each([
    ['1024', 1024],
    ['0', 0],
    [2048, 2048],
    ['', undefined],
    ['1,024', undefined],
    ['12.5', undefined],
    ['abc', undefined],
    [Number.NaN, undefined],
    [-1, undefined],
    [undefined, undefined],
  ] as const)('parses size %s', (input, expected) => {
    expect(parseByteSize(input)).toBe(expected);
  });

  it('names the checksum algorithm', () => {
    expect(parseChecksum({ md5: 'A'.repeat(32), sha1: 'b'.repeat(40) })).toBe(
      `md5:${'a'.repeat(32)}`,
    );
    expect(parseChecksum({ sha1: 'b'.repeat(40) })).toBe(`sha1:${'b'.repeat(40)}`);
    expect(parseChecksum({ crc32: 'deadbeef' })).toBe('crc32:deadbeef');
    expect(parseChecksum({ md5: 'too-short', sha1: 'also-short' })).toBeUndefined();
    expect(parseChecksum({})).toBeUndefined();
  });

  it('prefers date, then publicdate, then year', () => {
    expect(resolvePublicationDate({ date: '1922-03-04T00:00:00Z', year: '1900' })).toBe(
      '1922-03-04',
    );
    expect(resolvePublicationDate({ date: 'circa 1922', publicdate: '1923-01-02' })).toBe(
      '1923-01-02',
    );
    expect(resolvePublicationDate({ year: 1865 })).toBe('1865');
    expect(resolvePublicationDate({ date: 'unknown' })).toBeUndefined();
    expect(resolvePublicationDate({})).toBeUndefined();
  });
});

describe('access state', () => {
  it('recognizes lending collections', () => {
    expect(readItemAccess({ collection: ['inlibrary', 'americana'] })).toMatchObject({
      lending: true,
      dark: false,
      noDownload: false,
    });
    expect(readItemAccess({ collection: 'printdisabled' }).lending).toBe(true);
    expect(readItemAccess({ collection: ['feature_films'] }).lending).toBe(false);
  });

  it('reads item-level flags', () => {
    expect(readItemAccess({}, { isDark: true }).dark).toBe(true);
    expect(readItemAccess({}, { noDownload: true }).noDownload).toBe(true);
  });
});

describe('mapItem', () => {
  it('maps a search document into the shared item model', () => {
    const item = mapItem({ metadata: searchDoc }, urls);

    expect(item).toBeDefined();
    expect(item).toMatchObject({
      id: 'nosferatu',
      providerId: ARCHIVE_PROVIDER_ID,
      title: 'Nosferatu (1922)',
      description: 'A silent vampire film.',
      type: 'movie',
      creator: 'Murnau, F. W., Film Preservation Society',
      publicationDate: '1922-03-04',
      categories: ['feature_films'],
      tags: ['vampire', 'silent film', 'horror'],
      thumbnailUrl: 'https://archive.org/services/img/nosferatu',
      sourceUrl: 'https://archive.org/details/nosferatu',
    });
    expect(item?.rights).toMatchObject({
      license: 'https://creativecommons.org/publicdomain/mark/1.0/',
      attributionUrl: 'https://archive.org/details/nosferatu',
    });
    expect(item?.metadata['downloads']).toBe(128);
  });

  it('classifies a collection from mediatype without a hardcoded identifier list', () => {
    const item = mapItem(
      {
        metadata: { identifier: 'SciFi_Horror', title: 'Sci-Fi / Horror', mediatype: 'collection' },
      },
      urls,
    );

    expect(item?.type).toBe('collection');
    expect(isArchiveCollection({ mediatype: 'collection' })).toBe(true);
    expect(isArchiveCollection({ mediatype: 'movies' }, { isCollection: true })).toBe(true);
    expect(isArchiveCollection({ mediatype: 'movies' })).toBe(false);
  });

  it('accepts single-value fields where other items use arrays', () => {
    const item = mapItem({ metadata: textDoc }, urls);

    expect(item).toMatchObject({
      type: 'document',
      creator: 'Carroll, Lewis',
      publicationDate: '1865',
      categories: ['gutenberg'],
      tags: ['fantasy'],
    });
  });

  it('maps a metadata response, including counts and access state', () => {
    const item = mapItem(
      {
        metadata: ITEM_RESPONSE.metadata,
        filesCount: ITEM_RESPONSE.files_count,
        itemSize: ITEM_RESPONSE.item_size,
        isDark: false,
        noDownload: false,
      },
      urls,
    );

    expect(item?.description).toBe(
      'An unauthorized adaptation of Dracula.\nRestored print.\n\nSecond paragraph & notes.',
    );
    expect(item?.publicationDate).toBe('1922-03-04');
    expect(item?.metadata).toMatchObject({
      fileCount: 6,
      itemSize: 536870912,
      accessStatus: 'public',
      collections: ['feature_films'],
    });
    expect(item?.rights).toMatchObject({
      rightsStatement: 'Public domain in the United States.',
    });
  });

  it('falls back to the identifier when an item has no title', () => {
    const item = mapItem({ metadata: { identifier: 'untitled-item' } }, urls);

    expect(item?.title).toBe('untitled-item');
    expect(item?.type).toBe('unknown');
    expect(item?.description).toBeUndefined();
    expect(item?.creator).toBeUndefined();
    expect(item?.publicationDate).toBeUndefined();
    expect(item?.rights).toBeUndefined();
  });

  it('still produces artwork for items without a cover', () => {
    // The Archive answers the thumbnail service with a placeholder, so a card always has an
    // image and the adapter never needs a second request to find out.
    const item = mapItem({ metadata: { identifier: 'no-art' } }, urls);

    expect(item?.thumbnailUrl).toBe('https://archive.org/services/img/no-art');
  });

  it('refuses a payload with no identifier', () => {
    expect(mapItem({ metadata: { title: 'Nameless' } }, urls)).toBeUndefined();
    expect(mapItem({ metadata: { identifier: '   ' } }, urls)).toBeUndefined();
  });

  it('records a lending restriction in metadata', () => {
    const item = mapItem({ metadata: LENDING_RESPONSE.metadata, filesCount: 3 }, urls);

    expect(item?.metadata['accessStatus']).toBe('lending-restricted');
    expect(item?.type).toBe('document');
    expect(item?.categories).toEqual(['inlibrary', 'printdisabled', 'americana']);
  });
});

describe('mapFiles', () => {
  it('lists content files, originals first, and drops administrative entries', () => {
    const files = mapFiles(ITEM_RESPONSE.files, 'nosferatu', publicAccess(), urls);

    expect(files.map((file) => file.name)).toEqual([
      'nosferatu.mp4',
      'nosferatu_512kb.mp4',
      'nosferatu_thumb.jpg',
      'nosferatu.ogv',
    ]);

    const [original, derivative] = files;

    expect(original).toMatchObject({
      id: 'nosferatu.mp4',
      providerId: ARCHIVE_PROVIDER_ID,
      itemId: 'nosferatu',
      extension: 'mp4',
      mimeType: 'video/mp4',
      sizeBytes: 536870912,
      downloadAvailable: true,
      viewable: true,
      accessStatus: 'public',
      checksum: `md5:${'b'.repeat(32)}`,
      downloadUrl: 'https://archive.org/download/nosferatu/nosferatu.mp4',
    });
    expect(derivative?.metadata).toMatchObject({
      source: 'derivative',
      format: '512Kb MPEG4',
      height: '480',
      width: '640',
    });
  });

  it('omits unknown sizes, formats, and checksums instead of guessing', () => {
    const [file] = mapFiles(
      [{ name: 'notes', source: 'original', format: 'Unknown Format', size: 'n/a' }],
      'item',
      publicAccess(),
      urls,
    );

    expect(file).toBeDefined();
    expect(file?.sizeBytes).toBeUndefined();
    expect(file?.mimeType).toBeUndefined();
    expect(file?.extension).toBeUndefined();
    expect(file?.checksum).toBeUndefined();
    // Nothing is playable without a known, browser-native type.
    expect(file?.viewable).toBe(false);
    expect(file?.downloadAvailable).toBe(true);
  });

  it('marks every file unavailable for a lending-library scan', () => {
    const files = mapFiles(
      LENDING_RESPONSE.files,
      'lendingbook',
      readItemAccess(LENDING_RESPONSE.metadata),
      urls,
    );

    expect(files).toHaveLength(3);
    for (const file of files) {
      expect(file.downloadAvailable).toBe(false);
      expect(file.viewable).toBe(false);
      expect(file.accessStatus).toBe('lending-restricted');
      // No link is offered for a file the provider will refuse to serve.
      expect(file.downloadUrl).toBeUndefined();
    }
  });

  it('honours nodownload and item-level darkness', () => {
    const noDownload = mapFiles(
      [{ name: 'track.mp3', source: 'original', format: 'VBR MP3' }],
      'nodownload_item',
      { dark: false, noDownload: true, lending: false },
      urls,
    );
    const dark = mapFiles(
      [{ name: 'page.jpg', source: 'original', format: 'JPEG' }],
      'darkitem',
      {
        dark: true,
        noDownload: false,
        lending: false,
      },
      urls,
    );

    expect(noDownload[0]?.accessStatus).toBe('download-restricted');
    expect(noDownload[0]?.downloadAvailable).toBe(false);
    expect(dark[0]?.accessStatus).toBe('item-unavailable');
    expect(dark[0]?.downloadAvailable).toBe(false);
  });

  it('withholds a file the provider marked private', () => {
    const [file] = mapFiles(
      [{ name: 'restricted.pdf', source: 'original', format: 'Text PDF', private: true }],
      'item',
      publicAccess(),
      urls,
    );

    expect(file?.downloadAvailable).toBe(false);
    expect(file?.accessStatus).toBe('private');
  });

  it('does not offer PDFs for viewing while no viewer exists', () => {
    const [file] = mapFiles(
      [{ name: 'book.pdf', source: 'derivative', format: 'Text PDF' }],
      'item',
      publicAccess(),
      urls,
    );

    expect(file?.mimeType).toBe('application/pdf');
    expect(file?.viewable).toBe(false);
    expect(file?.downloadAvailable).toBe(true);
  });

  it('ignores entries that are not objects or have no name', () => {
    expect(mapFiles('nope', 'item', publicAccess(), urls)).toEqual([]);
    expect(
      mapFiles(
        [null, 'string', { format: 'Metadata' }, { name: 'ok.jpg', format: 'JPEG' }],
        'item',
        publicAccess(),
        urls,
      ),
    ).toHaveLength(1);
  });
});

describe('mapCollection', () => {
  it('maps collection metadata with an item count when one is known', () => {
    const collection = mapCollection(
      { metadata: COLLECTION_METADATA_RESPONSE.metadata, itemCount: 4210, categoryIds: ['movies'] },
      urls,
    );

    expect(collection).toMatchObject({
      id: 'feature_films',
      providerId: ARCHIVE_PROVIDER_ID,
      title: 'Feature Films',
      description: 'Feature-length films collected from many sources.',
      itemCount: 4210,
      categoryIds: ['movies'],
      thumbnailUrl: 'https://archive.org/services/img/feature_films',
      sourceUrl: 'https://archive.org/details/feature_films',
    });
    expect(collection?.metadata['is_collection']).toBe(true);
  });

  it('omits an unknown item count rather than reporting zero', () => {
    const collection = mapCollection({ metadata: COLLECTION_METADATA_RESPONSE.metadata }, urls);

    expect(collection?.itemCount).toBeUndefined();
    expect(collection?.categoryIds).toEqual([]);
  });

  it('refuses a collection payload with no identifier', () => {
    expect(mapCollection({ metadata: { title: 'Nameless' } }, urls)).toBeUndefined();
  });
});
