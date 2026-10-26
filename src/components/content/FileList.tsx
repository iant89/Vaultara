import { Link } from 'react-router-dom';
import type { ContentFile } from '../../models/content';
import { formatByteSize } from '../../utils/format';
import { buildViewerPath } from '../../utils/links';
import { canReadPdf } from '../../viewers/pdf/isPdfFile';
import styles from './FileList.module.css';

interface FileListProps {
  readonly files: readonly ContentFile[];
}

function describe(file: ContentFile): string {
  return [file.mimeType, formatByteSize(file.sizeBytes)]
    .filter((part): part is string => part !== undefined && part.length > 0)
    .join(' · ');
}

/**
 * Files offered for an item (design spec 11.3, 5.4).
 *
 * Restriction is stated per file rather than per item: an item can be readable while its files are
 * not downloadable, and a file that cannot be fetched shows why instead of a disabled control.
 * Downloadable PDFs also get a Read link into the in-app viewer. Download links open the
 * provider's own URL in a new tab, which is also the attribution trail.
 */
export function FileList({ files }: FileListProps) {
  if (files.length === 0) {
    return <p className={styles.empty}>No files are listed for this item.</p>;
  }

  return (
    <ul className={styles.list}>
      {files.map((file) => {
        const summary = describe(file);
        const canDownload = file.downloadAvailable && file.downloadUrl !== undefined;

        return (
          <li key={file.id} className={styles.row}>
            <div className={styles.identity}>
              <span className={styles.name}>{file.name}</span>
              {summary.length > 0 ? <span className={styles.meta}>{summary}</span> : null}
            </div>

            <div className={styles.actions}>
              {canReadPdf(file) ? (
                <Link
                  className={styles.action}
                  to={buildViewerPath(
                    { providerId: file.providerId, itemId: file.itemId },
                    file.id,
                  )}
                  aria-label={`Read ${file.name}`}
                >
                  Read
                </Link>
              ) : null}

              {canDownload ? (
                <a
                  className={styles.action}
                  href={file.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Download ${file.name}`}
                >
                  Download
                </a>
              ) : (
                <span className={styles.restricted}>Not downloadable</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
