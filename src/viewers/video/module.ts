import { isSafeDownloadUrl } from '../../downloads/describe';
import { CONTENT_TYPES, type ContentFile, type ContentItem } from '../../models/content';
import type { ViewerModule } from '../types';
import { canPlayVideo, isVideoDerivative } from './isVideoFile';

export const videoViewer: ViewerModule = {
  descriptor: {
    id: 'video',
    name: 'Video player',
    supportedContentTypes: CONTENT_TYPES.filter((type) => type !== 'collection'),
    supportedMimeTypes: ['video/mp4', 'video/webm', 'video/ogg'],
    supportedExtensions: ['mp4', 'webm', 'ogv'],
    supportsFullscreen: true,
    supportsProgress: true,
    supportsOffline: false,
  },
  match(file, item) {
    return videoMatchScore(file, item);
  },
  load: async () => {
    const module = await import('./VideoPlayer');
    return { default: module.VideoPlayer };
  },
};

export function videoMatchScore(file: ContentFile, item: ContentItem): number {
  if (!canPlayVideo(file) || !isSafeDownloadUrl(file.downloadUrl)) {
    return 0;
  }

  let score = 70;

  if (isVideoDerivative(file)) {
    score -= 20;
  } else {
    score += 10;
  }

  const source = String(file.metadata['source'] ?? '').toLowerCase();

  if (source === 'original' && !isVideoDerivative(file)) {
    score += 10;
  }

  if (item.type === 'movie' || item.type === 'video') {
    score += 10;
  }

  return score;
}
