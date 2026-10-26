import type { DownloadRecord, DownloadStatus } from '../models/download';
import { canPlayAudio } from '../viewers/audio/isAudioFile';
import { canReadBook } from '../viewers/book/isBookFile';
import { canViewImage } from '../viewers/image/isImageFile';
import { canReadPdf } from '../viewers/pdf/isPdfFile';
import { canPlayVideo } from '../viewers/video/isVideoFile';

export interface DownloadAccess {
  readonly name: string;
  readonly mimeType?: string;
  readonly downloadAvailable: boolean;
  readonly downloadUrl?: string;
  readonly accessStatus?: string;
}

export function isSafeDownloadUrl(value: string | undefined): value is string {
  if (value === undefined) {
    return false;
  }

  const trimmed = value.trim();

  if (trimmed === '') {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function canOfferDownload(file: DownloadAccess): boolean {
  return file.downloadAvailable && isSafeDownloadUrl(file.downloadUrl);
}

export function describeDownloadRestriction(file: DownloadAccess): string {
  if (
    file.downloadAvailable &&
    file.downloadUrl !== undefined &&
    !isSafeDownloadUrl(file.downloadUrl)
  ) {
    return 'Not downloadable. The provider URL is not a valid http(s) address.';
  }

  switch (file.accessStatus) {
    case 'lending-restricted':
      return 'Not downloadable. The provider requires borrowing, which this app does not support.';
    case 'download-restricted':
      return 'Not downloadable. The provider marked this file as restricted.';
    case 'item-unavailable':
      return 'Not downloadable. This item is not available.';
    case 'private':
      return 'Not downloadable. This file is private.';
    default:
      return 'Not downloadable';
  }
}

export function describeViewerCompatibility(
  file: Pick<DownloadAccess, 'name' | 'mimeType'> & {
    readonly downloadAvailable: boolean;
    readonly downloadUrl?: string;
  },
): string {
  if (canReadPdf(file)) {
    return 'In-app reader';
  }

  if (canReadBook(file)) {
    return 'In-app book';
  }

  if (canViewImage(file)) {
    return 'In-app gallery';
  }

  if (canPlayAudio(file)) {
    return 'In-app player';
  }

  if (canPlayVideo(file)) {
    return 'In-app video';
  }

  return 'No in-app viewer';
}

export function describeDownloadStatus(record: Pick<DownloadRecord, 'status' | 'detail'>): string {
  if (record.status === 'unavailable') {
    return record.detail ?? 'Could not start this download.';
  }

  return 'Opened in the browser. This app cannot confirm the download finished.';
}

export function downloadStatusLabel(status: DownloadStatus): string {
  return status === 'unavailable' ? 'Unavailable' : 'Opened';
}
