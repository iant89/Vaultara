import { isSafeDownloadUrl } from '../../downloads/describe';
import { CONTENT_TYPES, type ContentFile, type ContentItem } from '../../models/content';
import type { ViewerModule } from '../types';
import { canReadBook, isEpubFile } from './isBookFile';

export const bookViewer: ViewerModule = {
  descriptor: {
    id: 'book',
    name: 'Book reader',
    supportedContentTypes: CONTENT_TYPES.filter((type) => type !== 'collection'),
    supportedMimeTypes: ['application/epub+zip', 'application/epub', 'text/plain'],
    supportedExtensions: ['epub', 'txt'],
    supportsFullscreen: true,
    supportsProgress: true,
    supportsOffline: false,
  },
  match(file, item) {
    return bookMatchScore(file, item);
  },
  load: async () => {
    const module = await import('./BookReader');
    return { default: module.BookReader };
  },
};

export function bookMatchScore(file: ContentFile, item: ContentItem): number {
  if (!canReadBook(file) || !isSafeDownloadUrl(file.downloadUrl)) {
    return 0;
  }

  let score = isEpubFile(file) ? 95 : 55;

  if (item.type === 'book' || item.type === 'document') {
    score += 5;
  }

  return score;
}
