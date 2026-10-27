/**
 * Wayback replay URLs for Archive.org web items.
 *
 * The WARC is never fetched or parsed. Replay is the Wayback Machine iframe endpoint, with the
 * `if_` modifier so the capture is rewritten for embedding. The iframe host is always
 * web.archive.org — provider-supplied URLs are never used as `src`.
 */

import { isSafeDownloadUrl } from '../../downloads/describe';
import type { ContentFile, ContentItem } from '../../models/content';

/** Scripts and forms may run in the capture; same-origin and top navigation must not. */
export const WEB_ARCHIVE_SANDBOX = 'allow-scripts allow-forms';

const WAYBACK_HOST = 'web.archive.org';

export interface WebArchiveReplay {
  readonly originalUrl: string;
  readonly replayUrl: string;
  readonly captureLabel?: string;
  readonly timestamp?: string;
}

function firstMetadataString(metadata: Readonly<Record<string, unknown>>, key: string): string {
  const value = metadata[key];

  if (typeof value === 'string') {
    return value.trim();
  }

  if (Array.isArray(value)) {
    const first = value.find((entry) => typeof entry === 'string' && entry.trim().length > 0);

    return typeof first === 'string' ? first.trim() : '';
  }

  return '';
}

export function readOriginalUrl(item: ContentItem): string | undefined {
  const candidate =
    firstMetadataString(item.metadata, 'originalurl') ||
    firstMetadataString(item.metadata, 'original_url');

  if (candidate.length === 0 || !isSafeDownloadUrl(candidate)) {
    return undefined;
  }

  return candidate;
}

/** Digits from a provider date or WARC file name, 4–14 chars as Wayback accepts. */
export function timestampFromValue(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const digits = value.replaceAll(/\D/g, '');

  if (digits.length < 4 || digits.length > 14) {
    return undefined;
  }

  return digits;
}

export function timestampFromFileName(fileName: string): string | undefined {
  const matches = [...fileName.matchAll(/(\d{8,14})/g)];
  const last = matches[matches.length - 1]?.[1];

  return last;
}

function captureTimestamp(item: ContentItem, file: ContentFile): string | undefined {
  return (
    timestampFromFileName(file.name) ??
    timestampFromValue(item.publicationDate) ??
    timestampFromValue(firstMetadataString(item.metadata, 'date')) ??
    timestampFromValue(firstMetadataString(item.metadata, 'publicdate'))
  );
}

export function formatCaptureLabel(
  timestamp: string | undefined,
  fallback?: string,
): string | undefined {
  if (timestamp !== undefined && timestamp.length >= 8) {
    const year = timestamp.slice(0, 4);
    const month = timestamp.slice(4, 6);
    const day = timestamp.slice(6, 8);
    const time =
      timestamp.length >= 14
        ? ` ${timestamp.slice(8, 10)}:${timestamp.slice(10, 12)}:${timestamp.slice(12, 14)}`
        : '';

    return `${year}-${month}-${day}${time}`;
  }

  const trimmed = fallback?.trim();

  return trimmed !== undefined && trimmed.length > 0 ? trimmed : undefined;
}

export function buildWaybackReplayUrl(originalUrl: string, timestamp?: string): string | undefined {
  if (!isSafeDownloadUrl(originalUrl)) {
    return undefined;
  }

  let parsed: URL;

  try {
    parsed = new URL(originalUrl);
  } catch {
    return undefined;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return undefined;
  }

  const stamp = timestamp !== undefined && timestamp.length >= 4 ? `${timestamp}if_` : '*';

  return `https://${WAYBACK_HOST}/web/${stamp}/${parsed.href}`;
}

export function isWaybackReplayUrl(value: string): boolean {
  try {
    const parsed = new URL(value);

    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === WAYBACK_HOST &&
      parsed.pathname.startsWith('/web/')
    );
  } catch {
    return false;
  }
}

export function resolveWebArchiveReplay(
  item: ContentItem,
  file: ContentFile,
): WebArchiveReplay | undefined {
  const originalUrl = readOriginalUrl(item);

  if (originalUrl === undefined) {
    return undefined;
  }

  const timestamp = captureTimestamp(item, file);
  const replayUrl = buildWaybackReplayUrl(originalUrl, timestamp);

  if (replayUrl === undefined || !isWaybackReplayUrl(replayUrl)) {
    return undefined;
  }

  const captureLabel = formatCaptureLabel(
    timestamp,
    item.publicationDate ?? firstMetadataString(item.metadata, 'date'),
  );

  return {
    originalUrl,
    replayUrl,
    ...(captureLabel !== undefined ? { captureLabel } : {}),
    ...(timestamp !== undefined ? { timestamp } : {}),
  };
}
