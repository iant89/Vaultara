import { CONTENT_TYPES } from '../../models/content';
import type { ViewerModule } from '../types';

/**
 * Last-resort viewer. Score `1` so a specialized match always wins, but every listed file
 * still has somewhere to land (design spec 17.4).
 */
export const genericViewer: ViewerModule = {
  descriptor: {
    id: 'generic',
    name: 'File details',
    supportedContentTypes: CONTENT_TYPES,
    supportedMimeTypes: [],
    supportedExtensions: [],
    supportsFullscreen: false,
    supportsProgress: false,
    supportsOffline: false,
  },
  match() {
    return 1;
  },
  load: async () => {
    const module = await import('./GenericViewer');
    return { default: module.GenericViewer };
  },
};
