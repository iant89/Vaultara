/**
 * Viewer contracts (design specification 17.3, 17.4).
 *
 * The full registry implementation arrives in roadmap Phase 11. The PDF reader matches
 * files directly until then. Viewers are selected by matching content metadata and file
 * format against declared support, and provider metadata plus file extensions are treated
 * as untrusted when matching.
 */

import type { ContentFile, ContentItem, ContentType } from './content';
import type { ViewerProgress } from './userState';

export interface ViewerError {
  readonly code:
    | 'unsupported-format'
    | 'resource-unavailable'
    | 'invalid-content'
    | 'initialization-failed'
    | 'playback-failed';
  readonly message: string;
  readonly fileId?: string;
}

export interface ContentViewerProps {
  readonly item: ContentItem;
  readonly files: readonly ContentFile[];

  readonly initialProgress?: ViewerProgress;

  readonly onProgressChange?: (progress: ViewerProgress) => void;
  readonly onFavoriteToggle?: () => void;
  readonly onDownload?: (file: ContentFile) => void;
  readonly onError?: (error: ViewerError) => void;
}

/** What a viewer declares about itself so the selection service can match it. */
export interface ViewerDescriptor {
  readonly id: string;
  readonly name: string;

  readonly supportedContentTypes: readonly ContentType[];
  readonly supportedMimeTypes: readonly string[];
  readonly supportedExtensions: readonly string[];

  readonly supportsFullscreen: boolean;
  readonly supportsProgress: boolean;
  readonly supportsOffline: boolean;

  /** Additional permissions the viewer requires, e.g. sandbox allowances. */
  readonly requiredPermissions?: readonly string[];
}
