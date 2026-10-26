import { isSafeDownloadUrl } from '../../downloads/describe';
import type { ContentViewerProps } from '../../models/viewer';
import { formatByteSize } from '../../utils/format';
import styles from './GenericViewer.module.css';

/**
 * Fallback when no specialized viewer matches (design spec 17.4, 17.2 generic file viewer).
 *
 * It does not attempt to preview the bytes. It names the file, explains the gap, and offers
 * the provider download when one exists.
 */
export function GenericViewer({ item, files, activeFileId, onDownload }: ContentViewerProps) {
  const file = files.find((entry) => entry.id === activeFileId) ?? files[0];

  if (file === undefined) {
    return <p className={styles.empty}>No files are listed for this item.</p>;
  }

  const downloadUrl = isSafeDownloadUrl(file.downloadUrl) ? file.downloadUrl : undefined;
  const size = formatByteSize(file.sizeBytes);

  return (
    <div className={styles.viewer}>
      <p className={styles.lead}>
        This app has no specialized viewer for this file. Download opens the provider&apos;s copy in
        a new tab. “{item.title}” is unchanged on their site.
      </p>

      <dl className={styles.meta}>
        <div>
          <dt>File</dt>
          <dd>{file.name}</dd>
        </div>
        {file.mimeType !== undefined ? (
          <div>
            <dt>Format</dt>
            <dd>{file.mimeType}</dd>
          </div>
        ) : null}
        {size !== undefined ? (
          <div>
            <dt>Size</dt>
            <dd>{size}</dd>
          </div>
        ) : null}
      </dl>

      {downloadUrl !== undefined ? (
        <a
          className={styles.download}
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Download ${file.name}`}
          onClick={() => onDownload?.(file)}
        >
          Download
        </a>
      ) : (
        <p className={styles.note}>This file has no download this app can offer.</p>
      )}

      {files.length > 1 ? (
        <ul className={styles.others}>
          {files
            .filter((entry) => entry.id !== file.id)
            .map((entry) => (
              <li key={entry.id}>{entry.name}</li>
            ))}
        </ul>
      ) : null}
    </div>
  );
}
