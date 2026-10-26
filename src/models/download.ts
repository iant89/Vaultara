/**
 * A download this app asked the browser to open.
 *
 * Status is only what this client can observe. Opening a provider URL in a new
 * tab is not proof the file arrived, so this model has no `completed` value.
 */

export type DownloadStatus = 'opened' | 'unavailable';

export interface DownloadRecord {
  readonly id: string;
  readonly providerId: string;
  readonly itemId: string;
  readonly itemTitle: string;
  readonly fileId: string;
  readonly fileName: string;
  readonly mimeType?: string;
  readonly sizeBytes?: number;
  readonly downloadUrl?: string;
  readonly startedAt: string;
  readonly status: DownloadStatus;
  readonly detail?: string;
}

export interface DownloadDraft {
  readonly itemTitle: string;
  readonly file: {
    readonly providerId: string;
    readonly itemId: string;
    readonly id: string;
    readonly name: string;
    readonly mimeType?: string;
    readonly sizeBytes?: number;
    readonly downloadUrl?: string;
    readonly downloadAvailable: boolean;
    readonly accessStatus?: string;
  };
}
