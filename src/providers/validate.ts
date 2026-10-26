/**
 * Response validation for the adapter boundary (design specification 10.5).
 *
 * Normalization happens inside each adapter, so by the time a result reaches the gateway it
 * should already be a shared model. These checks exist for the failures that still get through:
 * an adapter that resolves with `undefined`, forgets to await, returns a bare array where a
 * page was promised, or declares a capability it does not implement.
 *
 * Everything here raises `invalid-response` rather than a `TypeError`, because the caller
 * cannot fix a malformed response — it must be reported as a provider failure.
 */

import { isContentType } from '../models/content';
import type {
  ContentCategory,
  ContentCollection,
  ContentFile,
  ContentItem,
} from '../models/content';
import { createAppError } from '../models/errors';
import type { PaginatedResult } from '../models/pagination';
import type { ProviderCapabilities } from '../models/provider';
import { normalizeUrl } from './normalize';

function invalidResponse(providerId: string, message: string): Error {
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

function readOptionalNumber(source: Record<string, unknown>, key: string): number | undefined {
  const raw = source[key];

  return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
}

function requireArray(value: unknown, providerId: string, description: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw invalidResponse(providerId, `${description} was not an array.`);
  }

  return value;
}

/** Validate the shape of a single item without re-normalizing its contents. */
export function validateContentItem(value: unknown, providerId: string): ContentItem {
  const record = asRecord(value);

  if (record === undefined) {
    throw invalidResponse(providerId, 'Item result was not an object.');
  }

  const id = record['id'];

  if (typeof id !== 'string' || id.trim() === '') {
    throw invalidResponse(providerId, 'Item result had no id.');
  }

  if (record['providerId'] !== providerId) {
    throw invalidResponse(
      providerId,
      `Item ${JSON.stringify(id)} was attributed to ${JSON.stringify(record['providerId'])}.`,
    );
  }

  if (typeof record['title'] !== 'string') {
    throw invalidResponse(providerId, `Item ${JSON.stringify(id)} had no title.`);
  }

  if (!Array.isArray(record['categories']) || !Array.isArray(record['tags'])) {
    throw invalidResponse(
      providerId,
      `Item ${JSON.stringify(id)} had malformed category or tag lists.`,
    );
  }

  if (asRecord(record['metadata']) === undefined) {
    throw invalidResponse(providerId, `Item ${JSON.stringify(id)} had malformed metadata.`);
  }

  return value as ContentItem;
}

export function validateContentItems(value: unknown, providerId: string): readonly ContentItem[] {
  return requireArray(value, providerId, 'Item list').map((entry) =>
    validateContentItem(entry, providerId),
  );
}

export function validateContentCollection(value: unknown, providerId: string): ContentCollection {
  const record = asRecord(value);

  if (record === undefined) {
    throw invalidResponse(providerId, 'Collection result was not an object.');
  }

  if (typeof record['id'] !== 'string' || record['id'].trim() === '') {
    throw invalidResponse(providerId, 'Collection result had no id.');
  }

  if (record['providerId'] !== providerId) {
    throw invalidResponse(
      providerId,
      `Collection ${JSON.stringify(record['id'])} was attributed to ${JSON.stringify(record['providerId'])}.`,
    );
  }

  return value as ContentCollection;
}

export function validateContentFiles(value: unknown, providerId: string): readonly ContentFile[] {
  return requireArray(value, providerId, 'File list').map((entry) => {
    const record = asRecord(entry);

    if (record === undefined || typeof record['name'] !== 'string') {
      throw invalidResponse(providerId, 'File result was not a usable file.');
    }

    if (record['providerId'] !== providerId) {
      throw invalidResponse(providerId, 'File result was attributed to another provider.');
    }

    return entry as ContentFile;
  });
}

export function validateContentCategories(
  value: unknown,
  providerId: string,
): readonly ContentCategory[] {
  return requireArray(value, providerId, 'Category list').map((entry) => {
    const record = asRecord(entry);

    if (record === undefined || typeof record['id'] !== 'string' || record['id'].trim() === '') {
      throw invalidResponse(providerId, 'Category result had no id.');
    }

    return entry as ContentCategory;
  });
}

/**
 * Validate a page of results.
 *
 * Pagination fields are repaired rather than rejected: a wrong `page` number is cosmetic,
 * whereas refusing to display otherwise valid content over it would be a real failure.
 */
export function validatePaginatedResult<T>(
  value: unknown,
  providerId: string,
  validateItem: (item: unknown, providerId: string) => T,
): PaginatedResult<T> {
  const record = asRecord(value);

  if (record === undefined) {
    throw invalidResponse(providerId, 'Paged result was not an object.');
  }

  const items = requireArray(record['items'], providerId, 'Paged result items');
  const total = readOptionalNumber(record, 'total');
  const nextCursor = record['nextCursor'];

  return {
    items: items.map((item) => validateItem(item, providerId)),
    page: Math.max(1, Math.trunc(readOptionalNumber(record, 'page') ?? 1)),
    pageSize: Math.max(0, Math.trunc(readOptionalNumber(record, 'pageSize') ?? items.length)),
    hasMore: record['hasMore'] === true,
    ...(total !== undefined ? { total: Math.max(0, Math.trunc(total)) } : {}),
    ...(typeof nextCursor === 'string' && nextCursor.trim() !== '' ? { nextCursor } : {}),
  };
}

/**
 * A resolved download URL must be absolute `http`/`https`. `null` is a legitimate answer
 * ("no direct URL available"), so it is preserved rather than treated as an error.
 */
export function validateDownloadUrl(value: unknown, providerId: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const url = normalizeUrl(value);

  if (url === undefined) {
    throw invalidResponse(providerId, 'Download URL was not an absolute http(s) URL.');
  }

  return url;
}

type CapabilityFlag =
  | 'search'
  | 'categories'
  | 'collections'
  | 'itemDetails'
  | 'relatedContent'
  | 'downloadableFiles'
  | 'streaming'
  | 'pagination'
  | 'adultContent';

function readFlag(
  source: Record<string, unknown>,
  flag: CapabilityFlag,
  providerId: string,
): boolean {
  const raw = source[flag];

  if (typeof raw !== 'boolean') {
    throw invalidResponse(providerId, `Capability ${JSON.stringify(flag)} was not a boolean.`);
  }

  return raw;
}

/**
 * Validate a declared capability set. Registration fails loudly on a malformed declaration:
 * silently defaulting to `false` would hide a real bug until a user hit a dead control.
 */
export function validateProviderCapabilities(
  value: unknown,
  providerId: string,
): ProviderCapabilities {
  const record = asRecord(value);

  if (record === undefined) {
    throw invalidResponse(providerId, 'Capabilities were not an object.');
  }

  const rawTypes = record['contentTypes'];

  if (!Array.isArray(rawTypes)) {
    throw invalidResponse(providerId, 'Capability "contentTypes" was not an array.');
  }

  return {
    search: readFlag(record, 'search', providerId),
    categories: readFlag(record, 'categories', providerId),
    collections: readFlag(record, 'collections', providerId),
    itemDetails: readFlag(record, 'itemDetails', providerId),
    relatedContent: readFlag(record, 'relatedContent', providerId),
    downloadableFiles: readFlag(record, 'downloadableFiles', providerId),
    streaming: readFlag(record, 'streaming', providerId),
    pagination: readFlag(record, 'pagination', providerId),
    adultContent: readFlag(record, 'adultContent', providerId),
    contentTypes: rawTypes.filter((type): type is ContentItem['type'] =>
      isContentType(String(type)),
    ),
  };
}
