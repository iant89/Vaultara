import { isSafeDownloadUrl } from '../../downloads/describe';
import { CONTENT_TYPES, type ContentFile, type ContentItem } from '../../models/content';
import type { ViewerModule } from '../types';
import { canPlayAudio, isAudioDerivative } from './isAudioFile';

export const audioViewer: ViewerModule = {
  descriptor: {
    id: 'audio',
    name: 'Audio player',
    supportedContentTypes: CONTENT_TYPES.filter((type) => type !== 'collection'),
    supportedMimeTypes: [
      'audio/mpeg',
      'audio/ogg',
      'audio/wav',
      'audio/flac',
      'audio/mp4',
      'audio/aac',
      'audio/webm',
    ],
    supportedExtensions: ['mp3', 'ogg', 'oga', 'wav', 'flac', 'm4a', 'aac', 'weba'],
    supportsFullscreen: false,
    supportsProgress: true,
    supportsOffline: false,
  },
  match(file, item) {
    return audioMatchScore(file, item);
  },
  load: async () => {
    const module = await import('./AudioPlayer');
    return { default: module.AudioPlayer };
  },
};

export function audioMatchScore(file: ContentFile, item: ContentItem): number {
  if (!canPlayAudio(file) || !isSafeDownloadUrl(file.downloadUrl)) {
    return 0;
  }

  let score = 70;

  if (isAudioDerivative(file)) {
    score -= 20;
  } else {
    score += 10;
  }

  const source = String(file.metadata['source'] ?? '').toLowerCase();

  if (source === 'original' && !isAudioDerivative(file)) {
    score += 10;
  }

  if (item.type === 'audio' || item.type === 'music') {
    score += 10;
  }

  return score;
}
