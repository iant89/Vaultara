import { Link } from 'react-router-dom';
import {
  canOfferDownload,
  describeDownloadRestriction,
  describeViewerCompatibility,
  isSafeDownloadUrl,
} from '../../downloads/describe';
import { useRecordDownload } from '../../downloads/useRecordDownload';
import type { ContentFile } from '../../models/content';
import { formatByteSize } from '../../utils/format';
import { buildViewerPath } from '../../utils/links';
import { canPlayAudio } from '../../viewers/audio/isAudioFile';
import { canViewImage } from '../../viewers/image/isImageFile';
import { canReadPdf } from '../../viewers/pdf/isPdfFile';
import styles from './FileList.module.css';

interface FileListProps {
  readonly files: readonly ContentFile[];
  readonly itemTitle?: string;
}

function describe(file: ContentFile): string {
  return [file.mimeType, formatByteSize(file.sizeBytes), describeViewerCompatibility(file)]
    .filter((part): part is string => part !== undefined && part.length > 0)
    .join(' · ');
}

function viewerVerb(file: ContentFile): 'Read' | 'View' | 'Listen' | undefined {
  if (canReadPdf(file)) {
    return 'Read';
  }

  if (canViewImage(file)) {
    return 'View';
  }

  if (canPlayAudio(file)) {
    return 'Listen';
  }

  return undefined;
}

function viewerOpenLink(file: ContentFile) {
  const verb = viewerVerb(file);

  if (verb === undefined) {
    return null;
  }

  return (
    <Link
      className={styles.action}
      to={buildViewerPath({ providerId: file.providerId, itemId: file.itemId }, file.id)}
      aria-label={`${verb} ${file.name}`}
    >
      {verb}
    </Link>
  );
}

/**
 * Files offered for an item (design spec 11.3, 5.4, 16).
 *
 * Restriction is stated per file rather than per item: an item can be readable while its files are
 * not downloadable, and a file that cannot be fetched shows why instead of a disabled control.
 * Downloadable PDFs get a Read link into the in-app reader; photographs get View into the
 * gallery; audio gets Listen into the player. Download links open the provider's own URL in a
 * new tab. This app does not fetch the file and does not claim the download finished.
 */
export function FileList({ files, itemTitle }: FileListProps) {
  const recordDownload = useRecordDownload();

  if (files.length === 0) {
    return <p className={styles.empty}>No files are listed for this item.</p>;
  }

  return (
    <ul className={styles.list}>
      {files.map((file) => {
        const summary = describe(file);
        const downloadUrl = isSafeDownloadUrl(file.downloadUrl) ? file.downloadUrl : undefined;
        const canDownload = canOfferDownload(file);

        return (
          <li key={file.id} className={styles.row}>
            <div className={styles.identity}>
              <span className={styles.name}>{file.name}</span>
              {summary.length > 0 ? <span className={styles.meta}>{summary}</span> : null}
            </div>

            <div className={styles.actions}>
              {viewerOpenLink(file)}

              {canDownload && downloadUrl !== undefined ? (
                <a
                  className={styles.action}
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Download ${file.name}`}
                  onClick={() => {
                    if (itemTitle !== undefined) {
                      recordDownload({ itemTitle, file });
                    }
                  }}
                >
                  Download
                </a>
              ) : (
                <span className={styles.restricted}>{describeDownloadRestriction(file)}</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
