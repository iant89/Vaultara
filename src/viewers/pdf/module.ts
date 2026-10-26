import { CONTENT_TYPES } from '../../models/content';
import type { ViewerModule } from '../types';
import { canReadPdf } from './isPdfFile';

export const pdfViewer: ViewerModule = {
  descriptor: {
    id: 'pdf',
    name: 'PDF reader',
    supportedContentTypes: CONTENT_TYPES.filter((type) => type !== 'collection'),
    supportedMimeTypes: ['application/pdf'],
    supportedExtensions: ['pdf'],
    supportsFullscreen: true,
    supportsProgress: true,
    supportsOffline: false,
  },
  match(file) {
    return canReadPdf(file) ? 90 : 0;
  },
  load: async () => {
    const module = await import('./PdfViewerHost');
    return { default: module.PdfViewerHost };
  },
};
