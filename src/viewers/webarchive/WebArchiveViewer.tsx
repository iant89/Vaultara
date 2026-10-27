import { ErrorState } from '../../components/feedback/ErrorState';
import { isSafeDownloadUrl } from '../../downloads/describe';
import { createAppError } from '../../models/errors';
import type { ContentViewerProps } from '../../models/viewer';
import { canViewWebArchive } from './isWebArchiveFile';
import { WEB_ARCHIVE_SANDBOX, resolveWebArchiveReplay } from './replay';
import styles from './WebArchiveViewer.module.css';

/**
 * In-app web-archive replay (design spec 18.8, roadmap Phase 15).
 *
 * Playback is a sandboxed iframe of the Wayback Machine. The capture cannot reach this app's
 * storage, credentials, or top-level navigation. WARC bytes are never fetched or executed.
 */
export function WebArchiveViewer({ item, files, activeFileId, onDownload }: ContentViewerProps) {
  const captures = files.filter(canViewWebArchive);
  const file = captures.find((entry) => entry.id === activeFileId) ?? captures[0];

  if (file === undefined) {
    return (
      <ErrorState
        error={createAppError(
          'unsupported-format',
          'No web-archive capture this app can replay is listed for this item.',
        )}
        title="This capture cannot be opened"
      />
    );
  }

  const replay = resolveWebArchiveReplay(item, file);
  const downloadUrl = isSafeDownloadUrl(file.downloadUrl) ? file.downloadUrl : undefined;
  const sourceUrl = isSafeDownloadUrl(item.sourceUrl) ? item.sourceUrl : undefined;

  if (replay === undefined) {
    return (
      <div className={styles.viewer}>
        <ErrorState
          error={createAppError(
            'unsupported-format',
            'This capture has no original URL this app can replay. Open it on the provider’s site or download the WARC if the provider permits.',
          )}
          title="This capture cannot be replayed"
        />
        {sourceUrl !== undefined ? (
          <a className={styles.link} href={sourceUrl} target="_blank" rel="noopener noreferrer">
            View this item on the provider
          </a>
        ) : null}
        {downloadUrl !== undefined ? (
          <a
            className={styles.link}
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Download ${file.name}`}
            onClick={() => onDownload?.(file)}
          >
            Download original
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.viewer}>
      <div className={styles.toolbar} role="toolbar" aria-label="Web archive">
        {replay.captureLabel !== undefined ? (
          <p className={styles.meta}>Captured {replay.captureLabel}</p>
        ) : (
          <p className={styles.meta}>Capture date unknown</p>
        )}
        <a
          className={styles.link}
          href={replay.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Original URL
        </a>
        <a
          className={styles.link}
          href={replay.replayUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open on Wayback Machine
        </a>
        {sourceUrl !== undefined ? (
          <a className={styles.link} href={sourceUrl} target="_blank" rel="noopener noreferrer">
            Provider page
          </a>
        ) : null}
        {downloadUrl !== undefined ? (
          <a
            className={styles.link}
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Download ${file.name}`}
            onClick={() => onDownload?.(file)}
          >
            Download
          </a>
        ) : null}
      </div>

      <p className={styles.hint}>
        Replay is a sandboxed Wayback Machine frame. The archived page cannot read this app’s
        storage, credentials, or privileged APIs. {item.title}.
      </p>

      <iframe
        className={styles.frame}
        title={`Archived capture of ${item.title}`}
        src={replay.replayUrl}
        sandbox={WEB_ARCHIVE_SANDBOX}
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
