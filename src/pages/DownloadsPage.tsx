import { Link } from 'react-router-dom';
import { EmptyState } from '../components/feedback/EmptyState';
import { LoadingState } from '../components/feedback/LoadingState';
import { Page } from '../components/layout/Page';
import { getProviderName } from '../config/providers';
import { useSession } from '../data/SessionContext';
import {
  describeDownloadStatus,
  downloadStatusLabel,
  isSafeDownloadUrl,
} from '../downloads/describe';
import { useRecordDownload } from '../downloads/useRecordDownload';
import type { DownloadRecord } from '../models/download';
import { formatByteSize } from '../utils/format';
import { buildItemPath, buildSettingsPath } from '../utils/links';
import styles from './DownloadsPage.module.css';

export function DownloadsPage() {
  const session = useSession();

  if (session.status === 'loading') {
    return (
      <Page title="Downloads">
        <LoadingState label="Loading downloads…" />
      </Page>
    );
  }

  if (session.status === 'signed-out') {
    return (
      <Page
        title="Downloads"
        intro="A log of files this app asked the browser to open. Vaultara does not fetch the file and cannot confirm it arrived."
      >
        <EmptyState
          title="Sign in to keep download history"
          description="Create an account to record the files you open. History stays in this browser. There is no download proxy on GitHub Pages."
          action={<Link to={buildSettingsPath()}>Go to Settings</Link>}
        />
      </Page>
    );
  }

  return (
    <Page
      title="Downloads"
      intro="A log of files this app asked the browser to open. Opening a provider URL is not a completed download. Pause and resume are not available without a server-side transfer this site does not have."
    >
      {session.downloads.length === 0 ? (
        <EmptyState
          title="Nothing opened yet"
          description="Use Download on an item's file list. Restricted, borrowed, and non-http(s) files are explained there instead of being fetched."
        />
      ) : (
        <ol className={styles.list}>
          {session.downloads.map((record) => (
            <DownloadRow key={record.id} record={record} />
          ))}
        </ol>
      )}
    </Page>
  );
}

function DownloadRow({ record }: { readonly record: DownloadRecord }) {
  const recordDownload = useRecordDownload();
  const size = formatByteSize(record.sizeBytes);
  const retryUrl = isSafeDownloadUrl(record.downloadUrl) ? record.downloadUrl : undefined;

  return (
    <li className={styles.row}>
      <Link className={styles.link} to={buildItemPath(record)}>
        {record.itemTitle}
      </Link>
      <p className={styles.meta}>
        {record.fileName}
        {record.mimeType !== undefined ? ` · ${record.mimeType}` : ''}
        {size !== undefined ? ` · ${size}` : ''}
        {` · ${getProviderName(record.providerId)}`}
        {' · '}
        <time dateTime={record.startedAt}>{record.startedAt.slice(0, 10)}</time>
      </p>
      <p className={styles.status}>
        <span className={styles.statusLabel}>{downloadStatusLabel(record.status)}</span>
        {` — ${describeDownloadStatus(record)}`}
      </p>
      {retryUrl !== undefined ? (
        <a
          className={styles.retry}
          href={retryUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            recordDownload({
              itemTitle: record.itemTitle,
              file: {
                providerId: record.providerId,
                itemId: record.itemId,
                id: record.fileId,
                name: record.fileName,
                ...(record.mimeType !== undefined ? { mimeType: record.mimeType } : {}),
                ...(record.sizeBytes !== undefined ? { sizeBytes: record.sizeBytes } : {}),
                downloadAvailable: true,
                downloadUrl: retryUrl,
              },
            });
          }}
        >
          Open again
        </a>
      ) : null}
    </li>
  );
}
