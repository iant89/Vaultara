import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingState } from '../../components/feedback/LoadingState';
import { Button } from '../../components/ui/Button';
import { isSafeDownloadUrl } from '../../downloads/describe';
import { useRecordDownload } from '../../downloads/useRecordDownload';
import type { ContentFile, ContentItem } from '../../models/content';
import type { AppError } from '../../models/errors';
import { describePdfLoadFailure } from './errors';
import type { PdfDocumentHandle } from './types';
import {
  bookColumnCount,
  describeVisiblePages,
  stepStartPage,
  visiblePages,
  type ScaleMode,
  type ViewerLayout,
} from './layout';
import { PdfPageView } from './PdfPageView';
import styles from './PdfViewer.module.css';
import { TRANSLATION_TARGETS, createPdfTranslator, type TranslatorPort } from './translation';
import { useElementSize } from './useElementSize';

export interface PdfViewerProps {
  readonly item: ContentItem;
  readonly file: ContentFile;
  readonly pdfFiles: readonly ContentFile[];
  readonly document?: PdfDocumentHandle;
  readonly openDocument?: (url: string, signal: AbortSignal) => Promise<PdfDocumentHandle>;
  readonly createTranslator?: (
    sourceLanguage: string,
    targetLanguage: string,
  ) => Promise<TranslatorPort | undefined>;
  readonly onSelectFile?: (fileId: string) => void;
  readonly onProgress?: (page: number) => void;
}

async function defaultOpenDocument(url: string, signal: AbortSignal): Promise<PdfDocumentHandle> {
  const { openPdfDocument } = await import('./engine');
  return openPdfDocument({ url, signal });
}

function describeTranslationHint(
  status: 'idle' | 'loading' | 'ready' | 'unavailable',
  source: TranslatorPort['source'],
  title: string,
): string {
  if (status === 'unavailable') {
    return 'Translation is unavailable. This browser has no on-device translator, and the online service could not be used.';
  }

  if (status === 'loading') {
    return 'Preparing translation…';
  }

  if (status === 'ready') {
    const overlay =
      'Translated text covers the original glyphs using the sampled colour and a matching web font.';

    if (source === 'online') {
      return `${overlay} Page text is sent to MyMemory (Translated.net); it is not stored in this app.`;
    }

    if (source === 'browser') {
      return `${overlay} Translation runs in this browser.`;
    }

    return overlay;
  }

  return `Reading “${title}”. Auto scale fits each page to its cell.`;
}

export function PdfViewer({
  item,
  file,
  pdfFiles,
  document: injectedDocument,
  openDocument = defaultOpenDocument,
  createTranslator = createPdfTranslator,
  onSelectFile,
  onProgress,
}: PdfViewerProps) {
  const recordDownload = useRecordDownload();
  const hintId = useId();
  const stageRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stageSize = useElementSize(stageRef);
  const [layout, setLayout] = useState<ViewerLayout>({ mode: 'book' });
  const [scaleMode, setScaleMode] = useState<ScaleMode>('auto');
  const [startPage, setStartPage] = useState(1);
  const [focusedPage, setFocusedPage] = useState<number | undefined>();
  const [turn, setTurn] = useState(false);
  const loadKey = `${file.id}:${file.downloadUrl ?? ''}`;
  const [session, setSession] = useState<{
    readonly key: string;
    readonly handle?: PdfDocumentHandle;
    readonly error?: AppError;
  }>({ key: '' });
  const [targetLanguage, setTargetLanguage] = useState('');
  const [translatorSession, setTranslatorSession] = useState<{
    readonly language: string;
    readonly status: 'loading' | 'ready' | 'unavailable';
    readonly port?: TranslatorPort;
  }>({ language: '', status: 'loading' });

  const handle = injectedDocument ?? (session.key === loadKey ? session.handle : undefined);
  const loadError =
    injectedDocument !== undefined
      ? undefined
      : file.downloadUrl === undefined
        ? describePdfLoadFailure(new Error('This file has no download URL.'))
        : session.key === loadKey
          ? session.error
          : undefined;
  const translator =
    targetLanguage.length === 0 || translatorSession.language !== targetLanguage
      ? undefined
      : translatorSession.port;
  const translatorStatus =
    targetLanguage.length === 0
      ? 'idle'
      : translatorSession.language !== targetLanguage
        ? 'loading'
        : translatorSession.status;

  const bookColumns = bookColumnCount(stageSize.width);
  const pageCount = handle?.pageCount ?? 0;
  const pages = useMemo(
    () => (handle === undefined ? [] : visiblePages(layout, pageCount, startPage, bookColumns)),
    [bookColumns, handle, layout, pageCount, startPage],
  );

  useEffect(() => {
    if (handle !== undefined) {
      onProgress?.(startPage);
    }
  }, [handle, onProgress, startPage]);
  const go = useCallback(
    (direction: -1 | 1) => {
      if (handle === undefined) {
        return;
      }

      setTurn(true);
      setStartPage((page) => stepStartPage(layout, handle.pageCount, page, direction, bookColumns));
      window.setTimeout(() => setTurn(false), 320);
    },
    [bookColumns, handle, layout],
  );

  useEffect(() => {
    if (injectedDocument !== undefined) {
      return;
    }

    const url = file.downloadUrl;

    if (url === undefined) {
      return;
    }

    let cancelled = false;
    let opened: PdfDocumentHandle | undefined;
    const controller = new AbortController();
    const key = loadKey;

    void (async () => {
      try {
        const documentHandle = await openDocument(url, controller.signal);

        if (cancelled) {
          documentHandle.destroy();
          return;
        }

        opened = documentHandle;
        setSession({ key, handle: documentHandle });
      } catch (error) {
        if (!cancelled) {
          setSession({ key, error: describePdfLoadFailure(error) });
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      opened?.destroy();
    };
  }, [file.downloadUrl, injectedDocument, loadKey, openDocument]);

  useEffect(() => {
    if (targetLanguage.length === 0) {
      return;
    }

    const language = targetLanguage;
    let cancelled = false;

    void createTranslator('en', language).then((port) => {
      if (cancelled) {
        return;
      }

      if (port === undefined) {
        setTranslatorSession({ language, status: 'unavailable' });
        return;
      }

      setTranslatorSession({ language, status: 'ready', port });
    });

    return () => {
      cancelled = true;
    };
  }, [createTranslator, targetLanguage]);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog === null) {
      return;
    }

    if (focusedPage === undefined) {
      if (dialog.open) {
        dialog.close();
      }

      return;
    }

    if (!dialog.open && typeof dialog.showModal === 'function') {
      dialog.showModal();
    }
  }, [focusedPage]);

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

      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault();
        go(1);
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        go(-1);
      } else if (event.key === 'Escape') {
        setFocusedPage(undefined);
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  const pageLabel = describeVisiblePages(pages, pageCount);
  const canGoPrevious = (pages[0] ?? 1) > 1;
  const canGoNext = (pages[pages.length - 1] ?? 1) < pageCount;

  return (
    <div className={styles.viewer}>
      <div className={styles.toolbar} role="toolbar" aria-label="PDF reader">
        <div className={styles.group}>
          <Button
            pressed={layout.mode === 'page'}
            aria-pressed={layout.mode === 'page'}
            onClick={() => setLayout({ mode: 'page' })}
          >
            Page
          </Button>
          <Button
            pressed={layout.mode === 'book'}
            aria-pressed={layout.mode === 'book'}
            onClick={() => setLayout({ mode: 'book' })}
          >
            Book
          </Button>
          <Button
            pressed={layout.mode === 'grid' && layout.gridColumns === 2}
            aria-pressed={layout.mode === 'grid' && layout.gridColumns === 2}
            aria-label="2 by 2 grid"
            onClick={() => setLayout({ mode: 'grid', gridColumns: 2 })}
          >
            2×2
          </Button>
          <Button
            pressed={layout.mode === 'grid' && layout.gridColumns === 3}
            aria-pressed={layout.mode === 'grid' && layout.gridColumns === 3}
            aria-label="3 by 3 grid"
            onClick={() => setLayout({ mode: 'grid', gridColumns: 3 })}
          >
            3×3
          </Button>
          <Button
            pressed={layout.mode === 'grid' && layout.gridColumns === 4}
            aria-pressed={layout.mode === 'grid' && layout.gridColumns === 4}
            aria-label="4 by 4 grid"
            onClick={() => setLayout({ mode: 'grid', gridColumns: 4 })}
          >
            4×4
          </Button>
        </div>

        <label className={styles.field}>
          Scale
          <select
            className={styles.select}
            value={scaleMode}
            onChange={(event) => setScaleMode(event.target.value as ScaleMode)}
          >
            <option value="auto">Auto</option>
            <option value="page">Fit page</option>
            <option value="width">Fit width</option>
          </select>
        </label>

        <div className={styles.group}>
          <Button onClick={() => go(-1)} disabled={!canGoPrevious} aria-label="Previous page">
            Previous
          </Button>
          <p className={styles.pageStatus} aria-live="polite">
            {pageLabel}
          </p>
          <Button onClick={() => go(1)} disabled={!canGoNext} aria-label="Next page">
            Next
          </Button>
        </div>

        {pdfFiles.length > 1 && onSelectFile !== undefined ? (
          <label className={styles.field}>
            File
            <select
              className={styles.select}
              value={file.id}
              onChange={(event) => onSelectFile(event.target.value)}
            >
              {pdfFiles.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className={styles.field}>
          Translate
          <select
            className={styles.select}
            value={targetLanguage}
            aria-describedby={hintId}
            onChange={(event) => setTargetLanguage(event.target.value)}
          >
            <option value="">Original</option>
            {TRANSLATION_TARGETS.map((language) => (
              <option key={language.id} value={language.id}>
                {language.label}
              </option>
            ))}
          </select>
        </label>

        {isSafeDownloadUrl(file.downloadUrl) ? (
          <a
            className={styles.download}
            href={file.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              recordDownload({ itemTitle: item.title, file });
            }}
          >
            Download
            <span className="sr-only"> {file.name}</span>
          </a>
        ) : null}

        <p id={hintId} className={styles.hint}>
          {describeTranslationHint(translatorStatus, translator?.source, item.title)}
        </p>
      </div>

      {loadError !== undefined ? (
        <ErrorState error={loadError} title="The PDF could not be opened" />
      ) : handle === undefined ? (
        <LoadingState label="Loading PDF…" />
      ) : (
        <div
          ref={stageRef}
          className={styles.stage}
          style={
            layout.mode === 'grid'
              ? { ['--grid-columns' as string]: String(layout.gridColumns ?? 2) }
              : { ['--book-columns' as string]: String(layout.mode === 'book' ? bookColumns : 1) }
          }
        >
          <div className={layout.mode === 'grid' ? styles.grid : styles.spread}>
            {pages.map((pageNumber) => (
              <PdfPageView
                key={pageNumber}
                document={handle}
                pageNumber={pageNumber}
                scaleMode={scaleMode}
                translator={translator}
                turning={layout.mode === 'book' && turn}
                onActivate={layout.mode === 'grid' ? () => setFocusedPage(pageNumber) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      <dialog
        ref={dialogRef}
        className={styles.lightbox}
        aria-label="Full screen page"
        onClose={() => setFocusedPage(undefined)}
      >
        <div className={styles.lightboxBar}>
          <Button onClick={() => setFocusedPage(undefined)}>Close</Button>
        </div>
        {focusedPage !== undefined && handle !== undefined ? (
          <div className={styles.lightboxStage}>
            <PdfPageView
              document={handle}
              pageNumber={focusedPage}
              scaleMode="page"
              translator={translator}
            />
          </div>
        ) : null}
      </dialog>
    </div>
  );
}
