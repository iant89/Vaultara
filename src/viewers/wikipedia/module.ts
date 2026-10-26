import { isSafeDownloadUrl } from '../../downloads/describe';
import type { ContentFile, ContentItem } from '../../models/content';
import type { ViewerModule } from '../types';
import { canReadWikipedia } from './isWikipediaFile';

export const wikipediaViewer: ViewerModule = {
  descriptor: {
    id: 'wikipedia',
    name: 'Wikipedia reader',
    supportedContentTypes: ['article'],
    supportedMimeTypes: ['application/vnd.vaultara.wikipedia+html'],
    supportedExtensions: [],
    supportsFullscreen: true,
    supportsProgress: false,
    supportsOffline: false,
  },
  match(file, item) {
    return wikipediaMatchScore(file, item);
  },
  load: async () => {
    const module = await import('./WikipediaReader');
    return { default: module.WikipediaReader };
  },
};

export function wikipediaMatchScore(file: ContentFile, item: ContentItem): number {
  if (!canReadWikipedia(file) || !isSafeDownloadUrl(file.downloadUrl)) {
    return 0;
  }

  if (item.providerId !== 'wikipedia') {
    return 0;
  }

  return item.type === 'article' ? 100 : 80;
}
