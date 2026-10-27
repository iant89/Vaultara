/**
 * Archive payloads → shared content models (design specification 11.2, 11.3, 20).
 *
 * Mapping is pure: no fetching, no timers, no globals. Everything here accepts `unknown`, because
 * the Archive returns single values or arrays for the same field depending on the item, describes
 * descriptions as HTML in some collections and plain text in others, and omits optional fields
 * entirely. Anything unusable is dropped rather than fabricated.
 */

import type {
  ContentCollection,
  ContentFile,
  ContentItem,
  ContentRights,
} from '../../models/content';
import {
  normalizeCategories,
  normalizeContentCollection,
  normalizeContentFile,
  normalizeContentItem,
  normalizeDescription,
  normalizeOptionalText,
  normalizePublicationDate,
  normalizeStringList,
  normalizeText,
  normalizeTags,
} from '../normalize';
import { isAppViewable, resolveFileExtension, resolveMimeType } from './taxonomy';

export const ARCHIVE_PROVIDER_ID = 'archive';

/** URL construction the mapping layer needs. `ArchiveApi` satisfies this structurally. */
export interface ArchiveUrlBuilder {
  detailsUrl(identifier: string): string;
  thumbnailUrl(identifier: string): string;
  downloadUrl(identifier: string, fileName: string): string;
}

/** Collections whose items exist but cannot be downloaded (lending-library scans). */
const LENDING_COLLECTIONS: ReadonlySet<string> = new Set([
  'inlibrary',
  'printdisabled',
  'lendinglibrary',
  'internetarchivescholar',
]);

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  apos: "'",
  gt: '>',
  hellip: '…',
  ldquo: '“',
  lsquo: '‘',
  lt: '<',
  mdash: '—',
  nbsp: ' ',
  ndash: '–',
  quot: '"',
  rdquo: '”',
  rsquo: '’',
};

const ENTITY_PATTERN = /&(#\d{1,7}|#[xX][0-9a-fA-F]{1,6}|[a-zA-Z][a-zA-Z0-9]{1,31});/g;
const SCRIPT_BLOCK_PATTERN = /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi;
const PARAGRAPH_BREAK_PATTERN = /<\s*\/?\s*(br|p|div|li|tr|td|th|h[1-6]|blockquote)\b[^>]*>/gi;
const TAG_PATTERN = /<[^>]*>/g;

function decodeEntities(value: string): string {
  return value.replace(ENTITY_PATTERN, (match: string, entity: string) => {
    if (entity.startsWith('#')) {
      const isHex = entity[1] === 'x' || entity[1] === 'X';
      const code = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);

      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }

    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/**
 * Reduce an Archive description to plain text.
 *
 * Descriptions routinely contain HTML (`<p>`, `<br />`, `<i>` and occasional links). Provider
 * HTML is never rendered — Phase 3 rule — so it is flattened here rather than passed to a view
 * that might one day use `dangerouslySetInnerHTML`.
 */
export function stripHtml(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }

  const withoutBlocks = value.replace(SCRIPT_BLOCK_PATTERN, ' ');
  const withLineBreaks = withoutBlocks.replace(PARAGRAPH_BREAK_PATTERN, '\n');
  // Inline tags are removed rather than replaced with a space: `<i>Dracula</i>.` must not become
  // `Dracula .`, because the space belongs to the document's text, not to the markup.
  const withoutTags = withLineBreaks.replace(TAG_PATTERN, '');

  return normalizeDescription(decodeEntities(withoutTags));
}

/**
 * Exported so callers that need to key a payload by item (correlating a bulk identifier lookup
 * back to its request) read the identifier the same way the mappers do.
 */
export function readIdentifier(source: Record<string, unknown>): string {
  return firstString(readFirst(source, ['identifier', 'id']));
}

/**
 * Whether an Archive record is a collection (a container) rather than an item.
 *
 * This is how nested collections are recognised without a hand-maintained list: the metadata
 * endpoint sets `is_collection`, and search documents carry `mediatype:collection`.
 */
export function isArchiveCollection(
  metadata: Record<string, unknown>,
  flags: { readonly isCollection?: unknown } = {},
): boolean {
  if (flags.isCollection === true || flags.isCollection === 'true') {
    return true;
  }

  const mediatype = firstString(readFirst(metadata, ['mediatype', 'type'])).toLowerCase();

  return mediatype === 'collection';
}

/** The Archive's metadata object, or `undefined` when the response carried none. */
export function readMetadataRecord(value: unknown): Record<string, unknown> | undefined {
  return asRecord(value);
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

/** First present, non-null value among `keys`. */
function readFirst(source: Record<string, unknown>, keys: readonly string[]): unknown {
  for (const key of keys) {
    const candidate = source[key];

    if (candidate !== undefined && candidate !== null) {
      return candidate;
    }
  }

  return undefined;
}

/** First entry of a single-or-array field, as text. */
function firstString(value: unknown): string {
  const [first] = normalizeStringList(value, { maxItems: 1, maxLength: 300 });

  return first ?? '';
}

/** A single-line display string built from a field that may hold several values. */
function joinedString(value: unknown, maxItems: number): string | undefined {
  const values = normalizeStringList(value, { maxItems, maxLength: 120 });

  return values.length === 0 ? undefined : values.join(', ');
}

/** Archive returns sizes as decimal strings; anything else is unknown, not zero. */
export function parseByteSize(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : undefined;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const digits = value.trim();

  if (!/^\d+$/.test(digits)) {
    return undefined;
  }

  const parsed = Number(digits);

  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

const CHECKSUM_PATTERNS: Readonly<Record<string, RegExp>> = {
  md5: /^[0-9a-f]{32}$/i,
  sha1: /^[0-9a-f]{40}$/i,
  crc32: /^[0-9a-f]{8}$/i,
};

/**
 * Prefer MD5 (present on every Archive file), then SHA-1, then CRC32. The algorithm is part of
 * the value so a consumer cannot mistake a SHA-1 for an MD5.
 */
export function parseChecksum(source: Record<string, unknown>): string | undefined {
  for (const [algorithm, pattern] of Object.entries(CHECKSUM_PATTERNS)) {
    const value = source[algorithm];

    if (typeof value === 'string' && pattern.test(value.trim())) {
      return `${algorithm}:${value.trim().toLowerCase()}`;
    }
  }

  return undefined;
}

/** `date`, then `publicdate`, then the numeric `year` (Archive mixes all three). */
export function resolvePublicationDate(source: Record<string, unknown>): string | undefined {
  for (const key of ['date', 'publicdate', 'year']) {
    const value = source[key];
    const normalized = normalizePublicationDate(
      typeof value === 'number' && Number.isFinite(value) ? String(value) : value,
    );

    if (normalized !== undefined) {
      return normalized;
    }
  }

  return undefined;
}

export interface ArchiveItemAccess {
  /** Item withdrawn from public view (`is_dark`). */
  readonly dark: boolean;
  /** Item visible but its files are not downloadable (`nodownload`). */
  readonly noDownload: boolean;
  /** Lending-library scan: metadata is public, files are not. */
  readonly lending: boolean;
}

export function readItemAccess(
  metadata: Record<string, unknown>,
  flags: { readonly isDark?: unknown; readonly noDownload?: unknown } = {},
): ArchiveItemAccess {
  const collections = normalizeStringList(metadata['collection'], { maxItems: 64, maxLength: 120 });
  const lending = collections.some((collection) =>
    LENDING_COLLECTIONS.has(collection.toLowerCase()),
  );

  return {
    dark: flags.isDark === true,
    noDownload: flags.noDownload === true,
    lending,
  };
}

const ADMINISTRATIVE_FORMATS: ReadonlySet<string> = new Set([
  'metadata',
  'item cdx index',
  'item cdx meta-index',
]);

/** Administrative entries (`_meta.xml`, CDX indexes) are not content and are never listed. */
function isAdministrativeFile(name: string, source: string, format: string): boolean {
  return (
    source === 'metadata' ||
    name.startsWith('_') ||
    ADMINISTRATIVE_FORMATS.has(format.toLowerCase())
  );
}

const SOURCE_ORDER: Readonly<Record<string, number>> = {
  original: 0,
  derivative: 1,
};

function sourceRank(source: string): number {
  return SOURCE_ORDER[source] ?? 2;
}

function describeAccess(
  access: ArchiveItemAccess,
  isPrivate: boolean,
): { downloadAvailable: boolean; accessStatus: string } {
  // Only the first matching restriction is reported: an item that is dark is not additionally
  // described as lending-restricted, because the stronger statement is the useful one.
  if (access.dark) {
    return { downloadAvailable: false, accessStatus: 'item-unavailable' };
  }

  if (access.lending) {
    return { downloadAvailable: false, accessStatus: 'lending-restricted' };
  }

  if (access.noDownload) {
    return { downloadAvailable: false, accessStatus: 'download-restricted' };
  }

  if (isPrivate) {
    return { downloadAvailable: false, accessStatus: 'private' };
  }

  return { downloadAvailable: true, accessStatus: 'public' };
}

function mapFile(
  entry: unknown,
  itemId: string,
  access: ArchiveItemAccess,
  urls: ArchiveUrlBuilder,
  providerId: string,
): ContentFile | undefined {
  const record = asRecord(entry);

  if (record === undefined) {
    return undefined;
  }

  const name = normalizeText(record['name']);

  if (name === '') {
    return undefined;
  }

  const format = normalizeText(record['format']);
  const source = normalizeText(record['source']).toLowerCase();

  if (isAdministrativeFile(name, source, format)) {
    return undefined;
  }

  const mimeType = resolveMimeType(format, name);
  const { downloadAvailable, accessStatus } = describeAccess(access, record['private'] === true);
  const extension = resolveFileExtension(name);
  const sizeBytes = parseByteSize(record['size']);
  const checksum = parseChecksum(record);
  const viewable = downloadAvailable && isAppViewable(mimeType);

  return normalizeContentFile(
    {
      id: name,
      name,
      downloadAvailable,
      viewable,
      accessStatus,
      // Provider detail is preserved for later phases (playback lengths, image dimensions) and
      // for attributing a download to its original file; nothing in the core reads it yet.
      metadata: {
        source,
        format,
        md5: record['md5'],
        sha1: record['sha1'],
        crc32: record['crc32'],
        length: record['length'],
        height: record['height'],
        width: record['width'],
        original: record['original'],
      },
      ...(extension !== undefined ? { extension } : {}),
      ...(mimeType !== undefined ? { mimeType } : {}),
      ...(sizeBytes !== undefined ? { sizeBytes } : {}),
      ...(checksum !== undefined ? { checksum } : {}),
      // A URL is only attached when the file may actually be fetched: offering a link that the
      // provider will refuse is worse than offering none (design spec 11.3).
      ...(downloadAvailable ? { downloadUrl: urls.downloadUrl(itemId, name) } : {}),
    },
    providerId,
    itemId,
  );
}

/**
 * Map the `files` array of a metadata response. Administrative files are dropped, originals come
 * before derivatives (so the "download the original" choice is the first one offered), and order
 * within a group follows the provider.
 */
export function mapFiles(
  files: unknown,
  itemId: string,
  access: ArchiveItemAccess,
  urls: ArchiveUrlBuilder,
  providerId: string = ARCHIVE_PROVIDER_ID,
): readonly ContentFile[] {
  if (!Array.isArray(files)) {
    return [];
  }

  return files
    .map((entry, index) => ({
      index,
      source: normalizeText(asRecord(entry)?.['source']).toLowerCase(),
      file: mapFile(entry, itemId, access, urls, providerId),
    }))
    .filter(
      (entry): entry is { index: number; source: string; file: ContentFile } =>
        entry.file !== undefined,
    )
    .sort((a, b) => sourceRank(a.source) - sourceRank(b.source) || a.index - b.index)
    .map((entry) => entry.file);
}

export interface ArchiveItemInput {
  /** The `metadata` object, or a search document (both expose the same fields). */
  readonly metadata: Record<string, unknown>;
  readonly filesCount?: unknown;
  readonly itemSize?: unknown;
  readonly isDark?: unknown;
  readonly noDownload?: unknown;
  /** Metadata-endpoint `is_collection`, when the caller has it. */
  readonly isCollection?: unknown;
}

function mapRights(
  metadata: Record<string, unknown>,
  sourceUrl: string,
): ContentRights | undefined {
  const license = normalizeOptionalText(metadata['licenseurl']);
  const rightsStatement = stripHtml(readFirst(metadata, ['rights', 'rights_statement']));

  if (license === undefined && rightsStatement === undefined) {
    return undefined;
  }

  return {
    ...(license !== undefined ? { license } : {}),
    ...(rightsStatement !== undefined ? { rightsStatement } : {}),
    attributionUrl: sourceUrl,
  };
}

/**
 * Build a normalized item. Returns `undefined` only when the payload has no identifier, since an
 * item without an identifier cannot be linked, cached, or fetched again — the one field that
 * cannot be defaulted.
 */
export function mapItem(
  input: ArchiveItemInput,
  urls: ArchiveUrlBuilder,
  providerId: string = ARCHIVE_PROVIDER_ID,
): ContentItem | undefined {
  const { metadata } = input;
  const identifier = readIdentifier(metadata);

  if (identifier === '') {
    return undefined;
  }

  const access = readItemAccess(metadata, {
    isDark: input.isDark,
    noDownload: input.noDownload,
  });
  const sourceUrl = urls.detailsUrl(identifier);
  const thumbnailUrl = urls.thumbnailUrl(identifier);
  const publisher = joinedString(metadata['publisher'], 2);
  const language = joinedString(metadata['language'], 3);
  const originalurl = firstString(readFirst(metadata, ['originalurl', 'original_url']));
  const emulator = firstString(metadata['emulator']);
  const processor = firstString(metadata['processor']);
  const os = firstString(readFirst(metadata, ['os', 'operating_system']));
  const collections = normalizeStringList(metadata['collection'], { maxItems: 24, maxLength: 80 });
  const downloads = parseByteSize(metadata['downloads']);
  const filesCount = parseByteSize(input.filesCount);

  return normalizeContentItem(
    {
      id: identifier,
      title: firstString(metadata['title']) || identifier,
      description: stripHtml(readFirst(metadata, ['description', 'summary'])),
      creator: joinedString(readFirst(metadata, ['creator', 'author']), 3),
      publicationDate: resolvePublicationDate(metadata),
      type: isArchiveCollection(metadata, { isCollection: input.isCollection })
        ? 'collection'
        : firstString(readFirst(metadata, ['mediatype', 'type'])) || 'unknown',
      thumbnailUrl,
      sourceUrl,
      categories: normalizeCategories(collections),
      tags: normalizeTags(metadata['subject']),
      rights: mapRights(metadata, sourceUrl),
      metadata: {
        identifier,
        mediatype: metadata['mediatype'],
        collections,
        subjects: normalizeStringList(metadata['subject'], { maxItems: 40, maxLength: 60 }),
        creator: metadata['creator'],
        date: metadata['date'],
        publicdate: metadata['publicdate'],
        year: metadata['year'],
        publisher,
        language,
        licenseurl: metadata['licenseurl'],
        downloads,
        itemSize: parseByteSize(input.itemSize),
        fileCount: filesCount,
        accessStatus: access.dark
          ? 'item-unavailable'
          : access.lending
            ? 'lending-restricted'
            : access.noDownload
              ? 'download-restricted'
              : 'public',
        thumbnailService: thumbnailUrl,
        sourcePage: sourceUrl,
        ...(originalurl !== '' ? { originalurl } : {}),
        ...(emulator !== '' ? { emulator } : {}),
        ...(processor !== '' ? { processor } : {}),
        ...(os !== '' ? { os } : {}),
      },
    },
    providerId,
  );
}

export interface ArchiveCollectionInput {
  readonly metadata: Record<string, unknown>;
  readonly itemCount?: number;
  readonly categoryIds?: readonly string[];
  readonly isCollection?: unknown;
}

/** Build a normalized collection from a search document or a collection item's metadata. */
export function mapCollection(
  input: ArchiveCollectionInput,
  urls: ArchiveUrlBuilder,
  providerId: string = ARCHIVE_PROVIDER_ID,
): ContentCollection | undefined {
  const { metadata } = input;
  const identifier = readIdentifier(metadata);

  if (identifier === '') {
    return undefined;
  }

  const sourceUrl = urls.detailsUrl(identifier);

  return normalizeContentCollection(
    {
      id: identifier,
      title: firstString(metadata['title']) || identifier,
      description: stripHtml(readFirst(metadata, ['description', 'summary'])),
      thumbnailUrl: urls.thumbnailUrl(identifier),
      sourceUrl,
      ...(input.itemCount !== undefined ? { itemCount: input.itemCount } : {}),
      categoryIds: input.categoryIds ?? [],
      metadata: {
        identifier,
        mediatype: metadata['mediatype'],
        is_collection: isArchiveCollection(metadata, { isCollection: input.isCollection }),
        collections: normalizeStringList(metadata['collection'], { maxItems: 24, maxLength: 80 }),
        subjects: normalizeStringList(metadata['subject'], { maxItems: 24, maxLength: 60 }),
        sourcePage: sourceUrl,
      },
    },
    providerId,
  );
}
