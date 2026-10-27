import { Link } from 'react-router-dom';
import {
  canOfferDownload,
  describeDownloadRestriction,
  describeViewerCompatibility,
  isSafeDownloadUrl,
} from '../../downloads/describe';
import { useRecordDownload } from '../../downloads/useRecordDownload';
import type { ContentFile, ContentType } from '../../models/content';
import { formatByteSize } from '../../utils/format';
import { buildViewerPath } from '../../utils/links';
import { canPlayAudio } from '../../viewers/audio/isAudioFile';
import { canReadBook } from '../../viewers/book/isBookFile';
import { canViewImage } from '../../viewers/image/isImageFile';
import { canReadPdf } from '../../viewers/pdf/isPdfFile';
import { canPlayGameBoy } from '../../viewers/emulator/isGameBoyFile';
import { canInspectSoftware } from '../../viewers/software/isSoftwareFile';
import { canPlayVideo } from '../../viewers/video/isVideoFile';
import { canViewWebArchive } from '../../viewers/webarchive/isWebArchiveFile';
import { canReadWikipedia } from '../../viewers/wikipedia/isWikipediaFile';
import { Artwork } from '../ui/Artwork';
import { ResponsiveGrid } from '../ui/ResponsiveGrid';
import styles from './FileList.module.css';

interface FileListProps {
  readonly files: readonly ContentFile[];
  readonly itemTitle?: string;
  readonly itemType?: ContentType;
  /** Item artwork used on viewer cards that are not themselves images. */
  readonly artworkUrl?: string;
}

export type ViewerVerb = 'Read' | 'View' | 'Listen' | 'Watch' | 'Play' | 'Inspect';

function describe(file: ContentFile, itemType?: ContentType): string {
  return [
    file.mimeType,
    formatByteSize(file.sizeBytes),
    describeViewerCompatibility(file, itemType),
  ]
    .filter((part): part is string => part !== undefined && part.length > 0)
    .join(' · ');
}

export function viewerVerb(file: ContentFile, itemType?: ContentType): ViewerVerb | undefined {
  if (canReadPdf(file) || canReadBook(file) || canReadWikipedia(file)) {
    return 'Read';
  }

  if (canViewImage(file)) {
    return 'View';
  }

  if (canViewWebArchive(file)) {
    return 'View';
  }

  if (canPlayAudio(file)) {
    return 'Listen';
  }

  if (canPlayVideo(file)) {
    return 'Watch';
  }

  if (canPlayGameBoy(file)) {
    return 'Play';
  }

  if (canInspectSoftware(file, itemType)) {
    return 'Inspect';
  }

  return undefined;
}

function cardArtworkSrc(file: ContentFile, artworkUrl: string | undefined): string | undefined {
  if (canViewImage(file) && isSafeDownloadUrl(file.downloadUrl)) {
    return file.downloadUrl;
  }

  return artworkUrl;
}

function DownloadAction({
  file,
  itemTitle,
}: {
  readonly file: ContentFile;
  readonly itemTitle?: string;
}) {
  const recordDownload = useRecordDownload();
  const downloadUrl = isSafeDownloadUrl(file.downloadUrl) ? file.downloadUrl : undefined;
  const canDownload = canOfferDownload(file);

  if (canDownload && downloadUrl !== undefined) {
    return (
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
    );
  }

  return <span className={styles.restricted}>{describeDownloadRestriction(file)}</span>;
}

function FileViewerCard({
  file,
  verb,
  itemTitle,
  itemType,
  artworkUrl,
}: {
  readonly file: ContentFile;
  readonly verb: ViewerVerb;
  readonly itemTitle?: string;
  readonly itemType?: ContentType;
  readonly artworkUrl?: string;
}) {
  const kind = describeViewerCompatibility(file, itemType);
  const src = cardArtworkSrc(file, artworkUrl);

  return (
    <li className={styles.card}>
      <Artwork
        {...(src !== undefined ? { src } : {})}
        alt=""
        fallbackLabel={verb}
        ratio="thumbnail"
        className={styles.cardArtwork}
      />
      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle}>
          <Link
            className={styles.cardLink}
            to={buildViewerPath({ providerId: file.providerId, itemId: file.itemId }, file.id)}
            aria-label={`${verb} ${file.name}`}
          >
            {file.name}
          </Link>
        </h3>
        <p className={styles.cardMeta}>{kind}</p>
        <div className={styles.cardActions}>
          <DownloadAction file={file} {...(itemTitle !== undefined ? { itemTitle } : {})} />
        </div>
      </div>
    </li>
  );
}

/**
 * Files offered for an item (design spec 11.3, 5.4, 16).
 *
 * Files a registered viewer can open are cards: the filename is the link into that viewer.
 * Everything else stays a list of downloads. Restriction is stated per file rather than per
 * item. Download links open the provider's own URL in a new tab.
 */
export function FileList({ files, itemTitle, itemType, artworkUrl }: FileListProps) {
  if (files.length === 0) {
    return <p className={styles.empty}>No files are listed for this item.</p>;
  }

  const viewable: { file: ContentFile; verb: ViewerVerb }[] = [];
  const others: ContentFile[] = [];

  for (const file of files) {
    const verb = viewerVerb(file, itemType);

    if (verb === undefined) {
      others.push(file);
    } else {
      viewable.push({ file, verb });
    }
  }

  return (
    <div className={styles.stack}>
      {viewable.length > 0 ? (
        <ResponsiveGrid label="Open in the app">
          {viewable.map(({ file, verb }) => (
            <FileViewerCard
              key={file.id}
              file={file}
              verb={verb}
              {...(itemTitle !== undefined ? { itemTitle } : {})}
              {...(itemType !== undefined ? { itemType } : {})}
              {...(artworkUrl !== undefined ? { artworkUrl } : {})}
            />
          ))}
        </ResponsiveGrid>
      ) : null}

      {others.length > 0 ? (
        <ul className={styles.list}>
          {others.map((file) => {
            const summary = describe(file, itemType);

            return (
              <li key={file.id} className={styles.row}>
                <div className={styles.identity}>
                  <span className={styles.name}>{file.name}</span>
                  {summary.length > 0 ? <span className={styles.meta}>{summary}</span> : null}
                </div>

                <div className={styles.actions}>
                  <DownloadAction file={file} {...(itemTitle !== undefined ? { itemTitle } : {})} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
