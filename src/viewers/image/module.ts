import { isSafeDownloadUrl } from '../../downloads/describe';
import { CONTENT_TYPES } from '../../models/content';
import type { ContentFile, ContentItem } from '../../models/content';
import type { ViewerModule } from '../types';
import { canViewImage, isImageThumbnail } from './isImageFile';

export const imageViewer: ViewerModule = {
  descriptor: {
    id: 'image',
    name: 'Photo gallery',
    supportedContentTypes: CONTENT_TYPES.filter((type) => type !== 'collection'),
    supportedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    supportedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    supportsFullscreen: true,
    supportsProgress: true,
    supportsOffline: false,
  },
  match(file, item) {
    return imageMatchScore(file, item);
  },
  load: async () => {
    const module = await import('./ImageGallery');
    return { default: module.ImageGallery };
  },
};

export function imageMatchScore(file: ContentFile, item: ContentItem): number {
  if (!canViewImage(file) || !isSafeDownloadUrl(file.downloadUrl)) {
    return 0;
  }

  let score = 70;

  if (isImageThumbnail(file)) {
    score -= 40;
  } else {
    score += 10;
  }

  const source = String(file.metadata['source'] ?? '').toLowerCase();

  if (source === 'original' && !isImageThumbnail(file)) {
    score += 10;
  }

  if (item.type === 'image') {
    score += 10;
  }

  return score;
}
