import { Link } from 'react-router-dom';
import { ErrorState } from '../../components/feedback/ErrorState';
import { isSafeDownloadUrl } from '../../downloads/describe';
import { createAppError } from '../../models/errors';
import type { ContentViewerProps } from '../../models/viewer';
import { formatByteSize } from '../../utils/format';
import { buildViewerPath } from '../../utils/links';
import { canPlayGameBoy } from '../emulator/isGameBoyFile';
import { canInspectSoftware } from './isSoftwareFile';
import { readSoftwarePlatform } from './platform';
import styles from './SoftwareViewer.module.css';

/**
 * Inspect-only software viewer (design spec 18.7, roadmap Phase 15).
 *
 * Disk images, installers, and archives are listed and may be downloaded when the provider
 * permits. They are never executed in this origin. A Game Boy ROM on the same item can be
 * launched in the existing emulator sandbox.
 */
export function SoftwareViewer({ item, files, activeFileId, onDownload }: ContentViewerProps) {
  const artifacts = files.filter((file) => canInspectSoftware(file, item.type));
  const file = artifacts.find((entry) => entry.id === activeFileId) ?? artifacts[0];

  if (file === undefined) {
    return (
      <ErrorState
        error={createAppError(
          'unsupported-format',
          'No software file this app can inspect is listed.',
        )}
        title="This software cannot be opened"
      />
    );
  }

  const downloadUrl = isSafeDownloadUrl(file.downloadUrl) ? file.downloadUrl : undefined;
  const size = formatByteSize(file.sizeBytes);
  const platform = readSoftwarePlatform(item);
  const playable = files.filter(canPlayGameBoy);
  const sourceUrl = isSafeDownloadUrl(item.sourceUrl) ? item.sourceUrl : undefined;

  return (
    <div className={styles.viewer}>
      <p className={styles.lead}>
        This app inspects archived software. It does not run downloaded programs, disk images, or
        installers in this origin. “{item.title}” stays on the provider’s site.
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
        {platform.os !== undefined ? (
          <div>
            <dt>Platform</dt>
            <dd>{platform.os}</dd>
          </div>
        ) : null}
        {platform.processor !== undefined ? (
          <div>
            <dt>Processor</dt>
            <dd>{platform.processor}</dd>
          </div>
        ) : null}
        {platform.emulator !== undefined ? (
          <div>
            <dt>Emulator</dt>
            <dd>{platform.emulator}</dd>
          </div>
        ) : null}
      </dl>

      {files.length > 1 ? (
        <section className={styles.files} aria-label="Available files">
          <h2 className={styles.heading}>Available files</h2>
          <ul>
            {files.map((entry) => (
              <li key={entry.id}>
                {entry.name}
                {formatByteSize(entry.sizeBytes) !== undefined
                  ? ` · ${formatByteSize(entry.sizeBytes)}`
                  : ''}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className={styles.actions}>
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

        {sourceUrl !== undefined ? (
          <a className={styles.link} href={sourceUrl} target="_blank" rel="noopener noreferrer">
            Provider page
          </a>
        ) : null}

        {playable.map((rom) => (
          <Link
            key={rom.id}
            className={styles.link}
            to={buildViewerPath({ providerId: rom.providerId, itemId: rom.itemId }, rom.id)}
            aria-label={`Play ${rom.name}`}
          >
            Play {rom.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
