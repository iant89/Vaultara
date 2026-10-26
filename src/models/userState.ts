/**
 * Per-user content state (design specification 20.4, 19.3, 7.1).
 *
 * Likes and favorites are separate concepts: a like is a personalization signal, a
 * favorite is an explicit bookmark in the global favorites collection. Neither may be
 * changed implicitly by progress tracking.
 */

export interface ViewerProgressBase {
  readonly updatedAt: string;
  readonly completed?: boolean;
}

export interface PdfViewerProgress extends ViewerProgressBase {
  readonly kind: 'pdf';
  readonly page: number;
  readonly scrollPercent?: number;
}

export interface BookViewerProgress extends ViewerProgressBase {
  readonly kind: 'book';
  readonly chapterId?: string;
  readonly positionPercent: number;
}

export interface AudioViewerProgress extends ViewerProgressBase {
  readonly kind: 'audio';
  readonly positionSeconds: number;
  readonly durationSeconds?: number;
}

export interface VideoViewerProgress extends ViewerProgressBase {
  readonly kind: 'video';
  readonly positionSeconds: number;
  readonly durationSeconds?: number;
}

export interface EmulatorViewerProgress extends ViewerProgressBase {
  readonly kind: 'emulator';
  /** Serialized save state. Treated as untrusted data and validated before loading. */
  readonly saveState?: string;
  readonly system?: string;
}

export interface WebArchiveViewerProgress extends ViewerProgressBase {
  readonly kind: 'web-archive';
  readonly lastUrl?: string;
  readonly captureTimestamp?: string;
}

export type ViewerProgress =
  | PdfViewerProgress
  | BookViewerProgress
  | AudioViewerProgress
  | VideoViewerProgress
  | EmulatorViewerProgress
  | WebArchiveViewerProgress;

export interface UserContentState {
  readonly providerId: string;
  readonly itemId: string;

  readonly liked: boolean;
  readonly favorited: boolean;
  readonly explored: boolean;

  readonly firstExploredAt?: string;
  readonly lastExploredAt?: string;
  readonly explorationCount?: number;

  readonly progress?: ViewerProgress;
}
