/**
 * Provider data normalization (design specification 9, 10.5, 20).
 *
 * Every value that crosses the adapter boundary is untrusted: provider APIs return mixed
 * types, missing fields, HTML fragments, and occasionally hostile URLs. These helpers coerce
 * that data into the shared models so no provider-specific shape — and no unsafe URL scheme —
 * reaches the application core.
 *
 * The rules applied throughout:
 *
 * - Missing or unusable optional data is dropped, not fabricated. An item without artwork is
 *   still a usable item; an item without an id is not.
 * - Text is trimmed and whitespace-collapsed. Control characters are removed because they
 *   corrupt layout and can be used to smuggle content past naive renderers.
 * - Only `http` and `https` URLs survive. `javascript:`, `data:`, and `file:` URLs are dropped
 *   rather than sanitized, since a provider has no legitimate reason to return them.
 * - Unknown provider-specific detail is preserved verbatim in `metadata`, so nothing is lost,
 *   but the core never dereferences it.
 */

import type {
  ContentCategory,
  ContentCollection,
  ContentFile,
  ContentItem,
  ContentRights,
  ContentType,
} from '../models/content';
import { isContentType } from '../models/content';
import { createAppError } from '../models/errors';
import { isValidProviderId } from '../models/identity';

/**
 * Replace C0 control characters and DEL with spaces, preserving tab and newline.
 *
 * Written as a loop rather than a regex literal: the pattern necessarily contains control
 * characters, which `no-control-regex` rejects, and suppressing that rule here would blunt it
 * everywhere else it is genuinely useful.
 */
function stripControlCharacters(value: string): string {
  let result = '';

  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    const isControl = (code < 0x20 && code !== 0x09 && code !== 0x0a) || code === 0x7f;

    result += isControl ? ' ' : character;
  }

  return result;
}

/** Keys that would mutate a prototype if they were copied into a plain object. */
const UNSAFE_METADATA_KEYS: ReadonlySet<string> = new Set([
  '__proto__',
  'constructor',
  'prototype',
]);

const SAFE_URL_PROTOCOLS: ReadonlySet<string> = new Set(['http:', 'https:']);

const YEAR_PATTERN = /^(?:1[0-9]{3}|2[0-9]{3})$/;
const PARTIAL_DATE_PATTERN = /^(\d{4})-(\d{2})(?:-(\d{2}))?/;

/** Provider vocabulary mapped onto the shared content types (design spec 11.2). */
const CONTENT_TYPE_ALIASES: Readonly<Record<string, ContentType>> = {
  films: 'movie',
  film: 'movie',
  movies: 'movie',
  movingimage: 'movie',
  video: 'video',
  videos: 'video',
  audio: 'audio',
  sounds: 'audio',
  sound: 'audio',
  music: 'music',
  audio_music: 'music',
  texts: 'document',
  text: 'document',
  document: 'document',
  documents: 'document',
  books: 'book',
  book: 'book',
  image: 'image',
  images: 'image',
  stillimage: 'image',
  'still image': 'image',
  software: 'software',
  data: 'software',
  games: 'game',
  game: 'game',
  web: 'website',
  websites: 'website',
  webpages: 'website',
  'web sites': 'website',
  collections: 'collection',
  collection: 'collection',
  archives: 'archive',
  archive: 'archive',
  articles: 'article',
  article: 'article',
};

/**
 * Collapse a value into single-line text. Non-string input yields an empty string, so callers
 * never have to distinguish "absent" from "wrong type".
 */
export function normalizeText(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return stripControlCharacters(value).replace(/\s+/g, ' ').trim();
}

/**
 * Normalize prose, keeping paragraph breaks. Collapsing every newline would turn a multi-
 * paragraph description into one wall of text, which is a real readability cost.
 */
export function normalizeDescription(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const cleaned = stripControlCharacters(value)
    .split('\n')
    .map((line) => line.replace(/[^\S\n]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned.length > 0 ? cleaned : undefined;
}

/** Text when present and non-empty, otherwise `undefined`. */
export function normalizeOptionalText(value: unknown): string | undefined {
  const text = normalizeText(value);
  return text.length > 0 ? text : undefined;
}

/**
 * Coerce a provider's medium label into a shared content type. Unknown labels become
 * `unknown` rather than failing, because an unrecognized type is still displayable content.
 */
export function normalizeContentType(value: unknown): ContentType {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';

  if (raw === '') {
    return 'unknown';
  }

  if (isContentType(raw)) {
    return raw;
  }

  return CONTENT_TYPE_ALIASES[raw] ?? 'unknown';
}

/**
 * Validate a provider id. Unlike most normalizers this throws, because an invalid provider id
 * is a programming error in an adapter, not untrusted data from a provider.
 */
export function normalizeProviderId(value: string): string {
  const normalized = value.trim().toLowerCase();

  if (!isValidProviderId(normalized)) {
    throw new TypeError(
      `Invalid provider id ${JSON.stringify(value)}: expected lowercase letters, digits, and hyphens.`,
    );
  }

  return normalized;
}

/**
 * Accept only absolute `http`/`https` URLs. Anything else — including hostile schemes such as
 * `javascript:` — is dropped rather than rewritten, so callers can treat `undefined` as
 * "no usable URL" without inspecting protocols themselves.
 *
 * `base` resolves relative references, which some providers return for artwork.
 */
export function normalizeUrl(value: unknown, base?: string): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();

  if (trimmed === '') {
    return undefined;
  }

  try {
    const url = base === undefined ? new URL(trimmed) : new URL(trimmed, base);

    return SAFE_URL_PROTOCOLS.has(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export interface StringListOptions {
  readonly maxItems?: number;
  readonly maxLength?: number;
}

function readStringArray(value: unknown): readonly unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  // Several providers return a single delimited string; treat it as a one-element list rather
  // than splitting on commas, which would mangle tags that legitimately contain them.
  return typeof value === 'string' ? [value] : [];
}

/** Trim, de-duplicate case-insensitively, and bound a provider-supplied list of labels. */
export function normalizeStringList(
  value: unknown,
  options: StringListOptions = {},
): readonly string[] {
  const maxItems = Math.max(1, options.maxItems ?? 50);
  const maxLength = Math.max(1, options.maxLength ?? 120);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const entry of readStringArray(value)) {
    const text = normalizeText(entry).slice(0, maxLength);

    if (text === '') {
      continue;
    }

    const key = text.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(text);

    if (result.length >= maxItems) {
      break;
    }
  }

  return result;
}

/** Category labels: fewer, longer, and shown beside the item. */
export function normalizeCategories(value: unknown): readonly string[] {
  return normalizeStringList(value, { maxItems: 24, maxLength: 80 });
}

/** Tags: more numerous and shorter than categories, and never user-facing chrome. */
export function normalizeTags(value: unknown): readonly string[] {
  return normalizeStringList(value, { maxItems: 40, maxLength: 60 });
}

/**
 * Reduce a provider date to `YYYY`, `YYYY-MM`, or `YYYY-MM-DD`. Providers return free text
 * ("circa 1922", "1922-03-14T00:00:00Z"), and precise display formatting belongs to the view
 * layer, so anything that is not a recognizable date is dropped rather than guessed at.
 */
export function normalizePublicationDate(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();

  if (YEAR_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const match = PARTIAL_DATE_PATTERN.exec(trimmed);

  if (match === null) {
    return undefined;
  }

  const [, year, month, day] = match;

  if (year === undefined || month === undefined) {
    return undefined;
  }

  const monthNumber = Number(month);
  const dayNumber = day === undefined ? undefined : Number(day);

  if (monthNumber < 1 || monthNumber > 12) {
    return undefined;
  }

  if (dayNumber !== undefined && (dayNumber < 1 || dayNumber > 31)) {
    return undefined;
  }

  return day === undefined ? `${year}-${month}` : `${year}-${month}-${day}`;
}

export interface MetadataOptions {
  readonly maxKeys?: number;
}

/**
 * Preserve provider-specific detail without importing its risks.
 *
 * Values are kept as-is: the core never dereferences them, and discarding them would lose
 * information that provider-specific views legitimately need. Dangerous keys are skipped so
 * that copying a payload cannot mutate a prototype chain.
 */
export function normalizeMetadata(
  value: unknown,
  options: MetadataOptions = {},
): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return Object.freeze({});
  }

  const maxKeys = Math.max(0, options.maxKeys ?? 100);
  const result: Record<string, unknown> = {};
  let count = 0;

  for (const [rawKey, entry] of Object.entries(value)) {
    if (UNSAFE_METADATA_KEYS.has(rawKey)) {
      continue;
    }

    const key = normalizeText(rawKey).slice(0, 100);

    if (key === '' || entry === undefined) {
      continue;
    }

    result[key] = entry;
    count += 1;

    if (count >= maxKeys) {
      break;
    }
  }

  return Object.freeze(result);
}

// ------------------------------------------------------------------ entity construction

function invalidResponse(providerId: string, message: string): Error {
  // Builders run inside adapters; returning an AppError lets the gateway classify the failure
  // without the adapter needing to import error plumbing.
  return Object.assign(
    new Error(message),
    createAppError('invalid-response', message, { providerId }),
  );
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function readString(source: Record<string, unknown>, ...keys: readonly string[]): unknown {
  for (const key of keys) {
    const candidate = source[key];

    if (candidate !== undefined && candidate !== null) {
      return candidate;
    }
  }

  return undefined;
}

function normalizeRights(value: unknown): ContentRights | undefined {
  const record = asRecord(value);

  if (record === undefined) {
    return undefined;
  }

  const license = normalizeOptionalText(record['license']);
  const rightsStatement = normalizeDescription(record['rightsStatement'] ?? record['statement']);
  const attributionUrl = normalizeUrl(record['attributionUrl']);

  if (license === undefined && rightsStatement === undefined && attributionUrl === undefined) {
    return undefined;
  }

  return {
    ...(license !== undefined ? { license } : {}),
    ...(rightsStatement !== undefined ? { rightsStatement } : {}),
    ...(attributionUrl !== undefined ? { attributionUrl } : {}),
  };
}

/**
 * Build a normalized `ContentItem` from an untrusted payload.
 *
 * Only the id is mandatory: an item with no title still needs to be listed and linked, so the
 * id stands in as a last resort rather than dropping the item entirely (design spec 4.2).
 */
export function normalizeContentItem(value: unknown, providerId: string): ContentItem {
  const record = asRecord(value);

  if (record === undefined) {
    throw invalidResponse(providerId, 'Item payload was not an object.');
  }

  const id = normalizeText(readString(record, 'id'));
  const providedProviderId = normalizeOptionalText(readString(record, 'providerId'));

  if (id === '') {
    throw invalidResponse(providerId, 'Item payload had no id.');
  }

  if (
    providedProviderId !== undefined &&
    normalizeProviderIdSafe(providedProviderId) !== providerId
  ) {
    throw invalidResponse(
      providerId,
      `Item ${JSON.stringify(id)} declared provider ${JSON.stringify(providedProviderId)} instead of ${JSON.stringify(providerId)}.`,
    );
  }

  const title = normalizeText(readString(record, 'title', 'name')) || id;
  const description = normalizeDescription(readString(record, 'description', 'summary'));
  const creator = normalizeOptionalText(readString(record, 'creator', 'author'));
  const publicationDate = normalizePublicationDate(readString(record, 'publicationDate', 'date'));
  const thumbnailUrl = normalizeUrl(readString(record, 'thumbnailUrl', 'thumbnail'));
  const artworkUrl = normalizeUrl(readString(record, 'artworkUrl', 'artwork'));
  const sourceUrl = normalizeUrl(readString(record, 'sourceUrl', 'url'));
  const rights = normalizeRights(record['rights']);

  return {
    id,
    providerId,
    title,
    type: normalizeContentType(readString(record, 'type', 'mediatype')),
    categories: normalizeCategories(readString(record, 'categories')),
    tags: normalizeTags(readString(record, 'tags')),
    metadata: normalizeMetadata(record['metadata']),
    ...(description !== undefined ? { description } : {}),
    ...(creator !== undefined ? { creator } : {}),
    ...(publicationDate !== undefined ? { publicationDate } : {}),
    ...(thumbnailUrl !== undefined ? { thumbnailUrl } : {}),
    ...(artworkUrl !== undefined ? { artworkUrl } : {}),
    ...(sourceUrl !== undefined ? { sourceUrl } : {}),
    ...(rights !== undefined ? { rights } : {}),
  };
}

/** A provider-supplied id that is not a valid slug is a payload defect, not a throw. */
function normalizeProviderIdSafe(value: string): string | undefined {
  const trimmed = value.trim().toLowerCase();
  return isValidProviderId(trimmed) ? trimmed : undefined;
}

export function normalizeContentCollection(value: unknown, providerId: string): ContentCollection {
  const record = asRecord(value);

  if (record === undefined) {
    throw invalidResponse(providerId, 'Collection payload was not an object.');
  }

  const id = normalizeText(readString(record, 'id'));

  if (id === '') {
    throw invalidResponse(providerId, 'Collection payload had no id.');
  }

  const description = normalizeDescription(readString(record, 'description', 'summary'));
  const thumbnailUrl = normalizeUrl(readString(record, 'thumbnailUrl', 'thumbnail'));
  const artworkUrl = normalizeUrl(readString(record, 'artworkUrl', 'artwork'));
  const sourceUrl = normalizeUrl(readString(record, 'sourceUrl', 'url'));
  const rawCount = readString(record, 'itemCount', 'count');
  const itemCount =
    typeof rawCount === 'number' && Number.isFinite(rawCount) && rawCount >= 0
      ? Math.trunc(rawCount)
      : undefined;

  return {
    id,
    providerId,
    title: normalizeText(readString(record, 'title', 'name')) || id,
    categoryIds: normalizeStringList(readString(record, 'categoryIds', 'categories'), {
      maxItems: 24,
      maxLength: 80,
    }),
    metadata: normalizeMetadata(record['metadata']),
    ...(description !== undefined ? { description } : {}),
    ...(thumbnailUrl !== undefined ? { thumbnailUrl } : {}),
    ...(artworkUrl !== undefined ? { artworkUrl } : {}),
    ...(sourceUrl !== undefined ? { sourceUrl } : {}),
    ...(itemCount !== undefined ? { itemCount } : {}),
  };
}

export function normalizeContentFile(
  value: unknown,
  providerId: string,
  itemId: string,
): ContentFile {
  const record = asRecord(value);

  if (record === undefined) {
    throw invalidResponse(providerId, 'File payload was not an object.');
  }

  const name = normalizeText(readString(record, 'name', 'id'));

  if (name === '') {
    throw invalidResponse(providerId, 'File payload had no name.');
  }

  const rawSize = readString(record, 'sizeBytes', 'size');
  const sizeBytes =
    typeof rawSize === 'number' && Number.isFinite(rawSize) && rawSize >= 0
      ? Math.trunc(rawSize)
      : undefined;

  const extension = normalizeOptionalText(readString(record, 'extension'));
  const mimeType = normalizeOptionalText(readString(record, 'mimeType', 'mime'));
  const checksum = normalizeOptionalText(readString(record, 'checksum'));
  const accessStatus = normalizeOptionalText(readString(record, 'accessStatus'));
  const downloadUrl = normalizeUrl(readString(record, 'downloadUrl'));

  return {
    id: normalizeText(readString(record, 'id')) || name,
    providerId,
    itemId: normalizeText(readString(record, 'itemId')) || itemId,
    name,
    // Defaults are conservative: a file is assumed neither playable nor downloadable unless the
    // provider says so (design spec 11.3).
    downloadAvailable: record['downloadAvailable'] === true,
    viewable: record['viewable'] === true,
    metadata: normalizeMetadata(record['metadata']),
    ...(extension !== undefined ? { extension } : {}),
    ...(mimeType !== undefined ? { mimeType } : {}),
    ...(sizeBytes !== undefined ? { sizeBytes } : {}),
    ...(checksum !== undefined ? { checksum } : {}),
    ...(accessStatus !== undefined ? { accessStatus } : {}),
    ...(downloadUrl !== undefined ? { downloadUrl } : {}),
  };
}

export function normalizeContentCategory(value: unknown, providerId?: string): ContentCategory {
  const record = asRecord(value);

  if (record === undefined) {
    throw invalidResponse(providerId ?? 'unknown', 'Category payload was not an object.');
  }

  const id = normalizeText(readString(record, 'id'));

  if (id === '') {
    throw invalidResponse(providerId ?? 'unknown', 'Category payload had no id.');
  }

  const description = normalizeDescription(readString(record, 'description'));
  const artworkUrl = normalizeUrl(readString(record, 'artworkUrl', 'artwork'));

  return {
    id,
    name: normalizeText(readString(record, 'name', 'title')) || id,
    ...(description !== undefined ? { description } : {}),
    ...(artworkUrl !== undefined ? { artworkUrl } : {}),
    ...(providerId !== undefined ? { providerId } : {}),
  };
}

/** Normalize a provider list, rejecting entries that cannot be represented at all. */
export function normalizeContentItems(values: unknown, providerId: string): readonly ContentItem[] {
  return readStringArray(values).map((entry) => normalizeContentItem(entry, providerId));
}
