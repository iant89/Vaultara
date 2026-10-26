/**
 * Runtime viewer module: a descriptor plus match/load functions.
 *
 * Kept out of `src/models/` so the shared contracts stay free of React.
 */

import type { ComponentType } from 'react';
import type { ContentFile, ContentItem } from '../models/content';
import type { ContentViewerProps, ViewerDescriptor } from '../models/viewer';

export interface ViewerModule {
  readonly descriptor: ViewerDescriptor;
  /**
   * How well this viewer can present `file` on `item`. `0` is no match. Higher wins.
   * MIME type, extension, and name are untrusted provider metadata.
   */
  match(file: ContentFile, item: ContentItem): number;
  load(): Promise<{ readonly default: ComponentType<ContentViewerProps> }>;
}
