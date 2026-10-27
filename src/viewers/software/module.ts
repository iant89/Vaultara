import type { ContentFile, ContentItem } from '../../models/content';
import type { ViewerModule } from '../types';
import { SOFTWARE_ISO_MIME, canInspectSoftware } from './isSoftwareFile';

export const softwareViewer: ViewerModule = {
  descriptor: {
    id: 'software',
    name: 'Software details',
    supportedContentTypes: ['software', 'game'],
    supportedMimeTypes: [
      SOFTWARE_ISO_MIME,
      'application/x-apple-diskimage',
      'application/x-msdownload',
      'application/zip',
    ],
    supportedExtensions: ['iso', 'dmg', 'exe', 'msi', 'zip'],
    supportsFullscreen: false,
    supportsProgress: false,
    supportsOffline: false,
  },
  match(file, item) {
    return softwareMatchScore(file, item);
  },
  load: async () => {
    const module = await import('./SoftwareViewer');
    return { default: module.SoftwareViewer };
  },
};

export function softwareMatchScore(file: ContentFile, item: ContentItem): number {
  if (!canInspectSoftware(file, item.type)) {
    return 0;
  }

  let score = 70;

  if (item.type === 'software') {
    score += 10;
  }

  return score;
}
