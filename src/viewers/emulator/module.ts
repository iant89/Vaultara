import { isSafeDownloadUrl } from '../../downloads/describe';
import { CONTENT_TYPES, type ContentFile, type ContentItem } from '../../models/content';
import type { ViewerModule } from '../types';
import { GAME_BOY_MIME, canPlayGameBoy } from './isGameBoyFile';

export const emulatorViewer: ViewerModule = {
  descriptor: {
    id: 'emulator',
    name: 'Game Boy emulator',
    supportedContentTypes: CONTENT_TYPES.filter((type) => type !== 'collection'),
    supportedMimeTypes: [GAME_BOY_MIME, 'application/x-gameboy-memory-cartridge'],
    supportedExtensions: ['gb'],
    supportsFullscreen: true,
    supportsProgress: true,
    supportsOffline: false,
  },
  match(file, item) {
    return emulatorMatchScore(file, item);
  },
  load: async () => {
    const module = await import('./GameBoyViewer');
    return { default: module.GameBoyViewer };
  },
};

export function emulatorMatchScore(file: ContentFile, item: ContentItem): number {
  if (!canPlayGameBoy(file) || !isSafeDownloadUrl(file.downloadUrl)) {
    return 0;
  }

  let score = 80;

  if (item.type === 'game' || item.type === 'software') {
    score += 10;
  }

  return score;
}
