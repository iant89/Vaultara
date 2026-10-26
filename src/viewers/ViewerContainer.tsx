import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/feedback/EmptyState';
import { ErrorState } from '../components/feedback/ErrorState';
import { LoadingState } from '../components/feedback/LoadingState';
import { Button } from '../components/ui/Button';
import { isSafeDownloadUrl } from '../downloads/describe';
import { useRecordDownload } from '../downloads/useRecordDownload';
import type { ContentFile, ContentItem } from '../models/content';
import type { ContentViewerProps } from '../models/viewer';
import type { ViewerProgress } from '../models/userState';
import { buildItemPath } from '../utils/links';
import { getViewerRegistry } from './composition';
import type { ViewerRegistry } from './registry';
import { selectViewer } from './select';
import styles from './ViewerContainer.module.css';

export interface ViewerContainerProps {
  readonly item: ContentItem;
  readonly files: readonly ContentFile[];
  readonly requestedFileId?: string;
  readonly initialProgress?: ViewerProgress;
  readonly onSelectFile: (fileId: string) => void;
  readonly onProgressChange?: (progress: ViewerProgress) => void;
  readonly registry?: ViewerRegistry;
}

function canUseFullscreen(): boolean {
  return typeof document !== 'undefined' && document.fullscreenEnabled === true;
}

/**
 * Shared viewer chrome (design spec 17.2, roadmap 11.3).
 *
 * Chooses a registered viewer, lazy-loads it, and hosts back/download/fullscreen/file
 * selection. Specialized toolbars stay inside the viewer. Unmounting this tree is the
 * resource-release path: loaders abort via the cancelled flag, and the child unmounts.
 */
export function ViewerContainer({
  item,
  files,
  requestedFileId,
  initialProgress,
  onSelectFile,
  onProgressChange,
  registry,
}: ViewerContainerProps) {
  const resolved = registry ?? getViewerRegistry();
  const recordDownload = useRecordDownload();
  const stageRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [loadKey, setLoadKey] = useState(0);
  const [loaded, setLoaded] = useState<{
    readonly viewerId: string;
    readonly loadKey: number;
    readonly component?: ComponentType<ContentViewerProps>;
    readonly error?: unknown;
  }>({ viewerId: '', loadKey: 0 });

  const selection = useMemo(
    () => selectViewer(resolved, item, files, requestedFileId),
    [files, item, requestedFileId, resolved],
  );

  const identity = { providerId: item.providerId, itemId: item.id };
  const activeFile = selection?.file;
  const downloadUrl =
    activeFile !== undefined && isSafeDownloadUrl(activeFile.downloadUrl)
      ? activeFile.downloadUrl
      : undefined;

  useEffect(() => {
    if (selection === undefined) {
      return;
    }

    const viewerId = selection.viewer.descriptor.id;
    const key = loadKey;
    let cancelled = false;

    void selection.viewer.load().then(
      (module) => {
        if (!cancelled) {
          setLoaded({ viewerId, loadKey: key, component: module.default });
        }
      },
      (error: unknown) => {
        if (!cancelled) {
          setLoaded({ viewerId, loadKey: key, error });
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [loadKey, selection]);

  const loadMatches =
    selection !== undefined &&
    loaded.viewerId === selection.viewer.descriptor.id &&
    loaded.loadKey === loadKey;
  const Viewer = loadMatches ? loaded.component : undefined;
  const loadError = loadMatches ? loaded.error : undefined;

  useEffect(() => {
    function onChange() {
      setFullscreen(document.fullscreenElement === stageRef.current);
    }

    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const handleDownload = useCallback(
    (file: ContentFile) => {
      recordDownload({ itemTitle: item.title, file });
    },
    [item.title, recordDownload],
  );

  const toggleFullscreen = useCallback(async () => {
    const stage = stageRef.current;

    if (stage === null || !canUseFullscreen()) {
      return;
    }

    try {
      if (document.fullscreenElement === stage) {
        await document.exitFullscreen();
      } else {
        await stage.requestFullscreen();
      }
    } catch {
      // The Fullscreen API rejected the request. Leave the viewer on the page.
    }
  }, []);

  if (files.length === 0) {
    return (
      <EmptyState
        title="No files to view"
        description="This item has no files this app can open."
        action={<Link to={buildItemPath(identity)}>Back to item details</Link>}
      />
    );
  }

  if (selection === undefined) {
    return (
      <EmptyState
        title="No viewer available"
        description="Nothing registered can present these files."
        action={<Link to={buildItemPath(identity)}>Back to item details</Link>}
      />
    );
  }

  const showFullscreen = selection.viewer.descriptor.supportsFullscreen && canUseFullscreen();

  return (
    <div className={styles.container}>
      <div className={styles.toolbar} role="toolbar" aria-label="Viewer">
        <Link className={styles.back} to={buildItemPath(identity)}>
          Back to item
        </Link>

        <p className={styles.viewerName}>{selection.viewer.descriptor.name}</p>

        {selection.files.length > 1 ? (
          <label className={styles.field}>
            File
            <select
              className={styles.select}
              value={selection.file.id}
              onChange={(event) => onSelectFile(event.target.value)}
            >
              {selection.files.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {downloadUrl !== undefined && activeFile !== undefined ? (
          <a
            className={styles.download}
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Download ${activeFile.name}`}
            onClick={() => handleDownload(activeFile)}
          >
            Download
          </a>
        ) : null}

        {showFullscreen ? (
          <Button onClick={() => void toggleFullscreen()} aria-pressed={fullscreen}>
            {fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          </Button>
        ) : null}
      </div>

      {loadError !== undefined ? (
        <ErrorState
          error={loadError}
          title="Viewer failed to start"
          onRetry={() => setLoadKey((current) => current + 1)}
        />
      ) : Viewer === undefined ? (
        <LoadingState label="Loading viewer…" />
      ) : (
        <div ref={stageRef} className={styles.stage}>
          <Viewer
            item={item}
            files={selection.files}
            activeFileId={selection.file.id}
            {...(initialProgress !== undefined ? { initialProgress } : {})}
            onSelectFile={onSelectFile}
            {...(onProgressChange !== undefined ? { onProgressChange } : {})}
            onDownload={handleDownload}
          />
        </div>
      )}
    </div>
  );
}
