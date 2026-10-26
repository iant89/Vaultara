import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ErrorState } from '../../components/feedback/ErrorState';
import { Button } from '../../components/ui/Button';
import { isSafeDownloadUrl } from '../../downloads/describe';
import { createAppError } from '../../models/errors';
import type { ContentFile } from '../../models/content';
import type { ContentViewerProps } from '../../models/viewer';
import { formatByteSize } from '../../utils/format';
import { canViewImage } from './isImageFile';
import styles from './ImageGallery.module.css';

const MIN_SCALE = 1;
const MAX_SCALE = 8;
const SCALE_STEP = 1.25;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function readDimension(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);

    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return undefined;
}

function describeImage(file: ContentFile): string {
  const width = readDimension(file.metadata['width']);
  const height = readDimension(file.metadata['height']);
  const size = formatByteSize(file.sizeBytes);
  const parts = [
    file.mimeType,
    size,
    width !== undefined && height !== undefined ? `${width} × ${height}` : undefined,
  ].filter((part): part is string => part !== undefined && part.length > 0);

  return parts.join(' · ');
}

/**
 * In-app photograph gallery (design spec 18.5, roadmap 12.1).
 *
 * The current image is an `<img>` pointing at the provider URL, so this client does not fetch
 * the bytes (and does not need CORS). Only the current photograph is loaded; neighbours are
 * named, not decoded. Zoom and pan are CSS transforms on that one image.
 */
export function ImageGallery({
  item,
  files,
  activeFileId,
  onSelectFile,
  onProgressChange,
  onDownload,
}: ContentViewerProps) {
  const images = useMemo(() => files.filter(canViewImage), [files]);
  const index = Math.max(
    0,
    images.findIndex((file) => file.id === activeFileId),
  );
  const file = images[index];
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ readonly x: number; readonly y: number } | undefined>(undefined);
  const activeId = file?.id ?? '';
  const [view, setView] = useState({
    id: activeId,
    scale: 1,
    x: 0,
    y: 0,
    failed: false,
  });

  if (view.id !== activeId) {
    setView({ id: activeId, scale: 1, x: 0, y: 0, failed: false });
  }

  const scale = view.id === activeId ? view.scale : 1;
  const offset = view.id === activeId ? { x: view.x, y: view.y } : { x: 0, y: 0 };
  const failed = view.id === activeId ? view.failed : false;
  const downloadUrl =
    file !== undefined && isSafeDownloadUrl(file.downloadUrl) ? file.downloadUrl : undefined;

  const resetView = useCallback(() => {
    setView((current) => ({ ...current, scale: 1, x: 0, y: 0 }));
  }, []);

  const go = useCallback(
    (delta: number) => {
      if (images.length === 0) {
        return;
      }

      const next = images[clamp(index + delta, 0, images.length - 1)];

      if (next !== undefined && next.id !== file?.id) {
        onSelectFile?.(next.id);
      }
    },
    [file?.id, images, index, onSelectFile],
  );

  const zoomBy = useCallback((factor: number) => {
    setView((current) => {
      const next = clamp(current.scale * factor, MIN_SCALE, MAX_SCALE);

      return {
        ...current,
        scale: next,
        ...(next <= MIN_SCALE ? { x: 0, y: 0 } : {}),
      };
    });
  }, []);

  useEffect(() => {
    if (file === undefined) {
      return;
    }

    onProgressChange?.({
      kind: 'image',
      fileId: file.id,
      index,
      updatedAt: new Date().toISOString(),
    });
  }, [file, index, onProgressChange]);

  useEffect(() => {
    const next = images[index + 1];

    if (next === undefined || !isSafeDownloadUrl(next.downloadUrl)) {
      return;
    }

    const prefetch = new Image();
    prefetch.src = next.downloadUrl;
  }, [images, index]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target;

      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        go(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        go(-1);
      } else if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        zoomBy(SCALE_STEP);
      } else if (event.key === '-') {
        event.preventDefault();
        zoomBy(1 / SCALE_STEP);
      } else if (event.key === '0') {
        event.preventDefault();
        resetView();
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, resetView, zoomBy]);

  useEffect(() => {
    const stage = stageRef.current;

    if (stage === null) {
      return;
    }

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      zoomBy(event.deltaY < 0 ? SCALE_STEP : 1 / SCALE_STEP);
    }

    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [zoomBy]);

  if (file === undefined || downloadUrl === undefined) {
    return (
      <ErrorState
        error={createAppError('unsupported-format', 'No photograph this app can display.')}
        title="No photograph to show"
      />
    );
  }

  const summary = describeImage(file);
  const canGoPrevious = index > 0;
  const canGoNext = index < images.length - 1;
  const fitted = scale <= MIN_SCALE;

  return (
    <div className={styles.viewer}>
      <div className={styles.toolbar} role="toolbar" aria-label="Photo gallery">
        <div className={styles.group}>
          <Button onClick={() => go(-1)} disabled={!canGoPrevious} aria-label="Previous image">
            Previous
          </Button>
          <p className={styles.status} aria-live="polite">
            {images.length === 1
              ? file.name
              : `${String(index + 1)} of ${String(images.length)} · ${file.name}`}
          </p>
          <Button onClick={() => go(1)} disabled={!canGoNext} aria-label="Next image">
            Next
          </Button>
        </div>

        <div className={styles.group}>
          <Button onClick={() => zoomBy(1 / SCALE_STEP)} disabled={fitted} aria-label="Zoom out">
            Zoom out
          </Button>
          <Button
            onClick={() => zoomBy(SCALE_STEP)}
            disabled={scale >= MAX_SCALE}
            aria-label="Zoom in"
          >
            Zoom in
          </Button>
          <Button pressed={fitted} aria-pressed={fitted} onClick={resetView}>
            Fit to screen
          </Button>
        </div>

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
      </div>

      <div
        ref={stageRef}
        className={styles.stage}
        onPointerDown={(event) => {
          if (fitted) {
            return;
          }

          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerMove={(event) => {
          const origin = drag.current;

          if (origin === undefined) {
            return;
          }

          const dx = event.clientX - origin.x;
          const dy = event.clientY - origin.y;
          drag.current = { x: event.clientX, y: event.clientY };
          setView((current) => ({ ...current, x: current.x + dx, y: current.y + dy }));
        }}
        onPointerUp={() => {
          drag.current = undefined;
        }}
        onPointerCancel={() => {
          drag.current = undefined;
        }}
      >
        {failed ? (
          <ErrorState
            error={createAppError(
              'network',
              'The provider did not send this image to the browser. Download opens their copy in a new tab.',
            )}
            title="Photograph could not be displayed"
          />
        ) : (
          <img
            className={styles.photo}
            src={downloadUrl}
            alt={file.name}
            draggable={false}
            style={{
              transform: `translate(${String(offset.x)}px, ${String(offset.y)}px) scale(${String(scale)})`,
              cursor: fitted ? 'default' : 'grab',
            }}
            onError={() => setView((current) => ({ ...current, failed: true }))}
          />
        )}
      </div>

      <p className={styles.hint}>
        {item.title}
        {summary.length > 0 ? ` · ${summary}` : ''}
        {
          '. Only this photograph is loaded. Zoom and pan stay on this page; the file is not fetched by this app.'
        }
      </p>
    </div>
  );
}
