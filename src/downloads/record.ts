import type { DownloadDraft, DownloadRecord } from '../models/download';
import { canOfferDownload, describeDownloadRestriction, isSafeDownloadUrl } from './describe';

export function createDownloadId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `download-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function buildDownloadRecord(
  draft: DownloadDraft,
  now: () => string = () => new Date().toISOString(),
): DownloadRecord {
  const { file, itemTitle } = draft;
  const offered = canOfferDownload(file);
  const url = isSafeDownloadUrl(file.downloadUrl) ? file.downloadUrl : undefined;

  return {
    id: createDownloadId(),
    providerId: file.providerId,
    itemId: file.itemId,
    itemTitle,
    fileId: file.id,
    fileName: file.name,
    ...(file.mimeType !== undefined ? { mimeType: file.mimeType } : {}),
    ...(file.sizeBytes !== undefined ? { sizeBytes: file.sizeBytes } : {}),
    ...(url !== undefined ? { downloadUrl: url } : {}),
    startedAt: now(),
    status: offered ? 'opened' : 'unavailable',
    ...(!offered ? { detail: describeDownloadRestriction(file) } : {}),
  };
}
