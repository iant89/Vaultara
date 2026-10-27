import type { ContentFile, ContentItem } from '../../models/content';
import type { ViewerModule } from '../types';
import { WEB_ARCHIVE_MIME, canViewWebArchive } from './isWebArchiveFile';

export const webArchiveViewer: ViewerModule = {
  descriptor: {
    id: 'webarchive',
    name: 'Web archive',
    supportedContentTypes: ['website', 'archive'],
    supportedMimeTypes: [
      WEB_ARCHIVE_MIME,
      'application/warc+gzip',
      'application/x-internet-archive',
    ],
    supportedExtensions: ['warc', 'arc'],
    supportsFullscreen: true,
    supportsProgress: false,
    supportsOffline: false,
  },
  match(file, item) {
    return webArchiveMatchScore(file, item);
  },
  load: async () => {
    const module = await import('./WebArchiveViewer');
    return { default: module.WebArchiveViewer };
  },
};

export function webArchiveMatchScore(file: ContentFile, item: ContentItem): number {
  if (!canViewWebArchive(file)) {
    return 0;
  }

  return item.type === 'website' || item.type === 'archive' ? 90 : 70;
}
