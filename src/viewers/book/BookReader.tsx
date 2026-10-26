import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingState } from '../../components/feedback/LoadingState';
import { Button } from '../../components/ui/Button';
import { isSafeDownloadUrl } from '../../downloads/describe';
import { createAppError } from '../../models/errors';
import type { ContentViewerProps } from '../../models/viewer';
import { canReadBook, isEpubFile } from './isBookFile';
import { describeBookLoadFailure, loadBook } from './loadBook';
import type { ParsedBook } from './parseEpub';
import styles from './BookReader.module.css';

const FONT_SIZES: readonly number[] = [16, 18, 20, 22, 24];
const LINE_HEIGHTS: readonly number[] = [1.4, 1.6, 1.8, 2];
const PROGRESS_INTERVAL_MS = 4000;

type Theme = 'dark' | 'sepia' | 'light';

export interface BookReaderProps extends ContentViewerProps {
  readonly load?: (
    url: string,
    kind: 'epub' | 'text',
    title: string,
    signal: AbortSignal,
  ) => Promise<ParsedBook>;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function renderWithMatches(text: string, query: string): ReactNode {
  const needle = query.trim();

  if (needle.length === 0) {
    return text;
  }

  const lower = text.toLowerCase();
  const match = needle.toLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;
  let index = lower.indexOf(match);
  let key = 0;

  while (index !== -1) {
    if (index > cursor) {
      parts.push(text.slice(cursor, index));
    }

    parts.push(
      <mark key={key} className={styles.hit}>
        {text.slice(index, index + needle.length)}
      </mark>,
    );
    key += 1;
    cursor = index + needle.length;
    index = lower.indexOf(match, cursor);
  }

  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return parts;
}

/**
 * In-app book reader (design spec 18.2, roadmap 12.3).
 *
 * EPUB is unzipped and reduced to chapter text. Markup is never rendered. Scanned books stay
 * with the PDF or image viewers. Fetching needs CORS; a blocked or oversized file still offers
 * download.
 */
export function BookReader({
  item,
  files,
  activeFileId,
  initialProgress,
  onProgressChange,
  onDownload,
  load = loadBook,
}: BookReaderProps) {
  const books = useMemo(() => files.filter(canReadBook), [files]);
  const index = Math.max(
    0,
    books.findIndex((file) => file.id === activeFileId),
  );
  const file = books[index];
  const articleRef = useRef<HTMLElement>(null);
  const lastReport = useRef(0);
  const fontId = useId();
  const spacingId = useId();
  const themeId = useId();
  const tocId = useId();
  const searchId = useId();
  const downloadUrl =
    file !== undefined && isSafeDownloadUrl(file.downloadUrl) ? file.downloadUrl : undefined;
  const [session, setSession] = useState<{
    readonly id: string;
    readonly status: 'loading' | 'ready' | 'error';
    readonly book?: ParsedBook;
    readonly chapter: number;
    readonly detail?: string;
  }>({ id: '', status: 'loading', chapter: 0 });
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.6);
  const [theme, setTheme] = useState<Theme>('dark');
  const [query, setQuery] = useState('');
  const [focusMode, setFocusMode] = useState(false);

  const activeId = file?.id ?? '';

  if (session.id !== activeId) {
    setSession({ id: activeId, status: 'loading', chapter: 0 });
    setQuery('');
  }

  const reportProgress = useCallback(
    (chapterId: string, percent: number, force: boolean) => {
      const now = Date.now();

      if (!force && now - lastReport.current < PROGRESS_INTERVAL_MS) {
        return;
      }

      lastReport.current = now;
      onProgressChange?.({
        kind: 'book',
        chapterId,
        positionPercent: clamp(percent, 0, 100),
        updatedAt: new Date().toISOString(),
      });
    },
    [onProgressChange],
  );

  useEffect(() => {
    if (file === undefined || downloadUrl === undefined) {
      return;
    }

    const controller = new AbortController();
    const kind = isEpubFile(file) ? 'epub' : 'text';

    void load(downloadUrl, kind, file.name, controller.signal).then(
      (book) => {
        if (controller.signal.aborted) {
          return;
        }

        let chapter = 0;

        if (initialProgress?.kind === 'book' && initialProgress.chapterId !== undefined) {
          const found = book.chapters.findIndex((entry) => entry.id === initialProgress.chapterId);
          chapter = found === -1 ? 0 : found;
        }

        setSession({ id: file.id, status: 'ready', book, chapter });
      },
      (error: unknown) => {
        if (
          controller.signal.aborted ||
          (error instanceof DOMException && error.name === 'AbortError')
        ) {
          return;
        }

        setSession({
          id: file.id,
          status: 'error',
          chapter: 0,
          detail: describeBookLoadFailure(error),
        });
      },
    );

    return () => controller.abort();
  }, [downloadUrl, file, initialProgress, load]);

  useEffect(() => {
    const article = articleRef.current;
    const book = session.book;
    const chapter = book?.chapters[session.chapter];

    if (article === null || chapter === undefined || session.status !== 'ready') {
      return;
    }

    if (
      initialProgress?.kind === 'book' &&
      initialProgress.chapterId === chapter.id &&
      initialProgress.positionPercent > 0
    ) {
      const max = article.scrollHeight - article.clientHeight;
      article.scrollTop = max > 0 ? (initialProgress.positionPercent / 100) * max : 0;
    } else {
      article.scrollTop = 0;
    }
  }, [initialProgress, session.book, session.chapter, session.status]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && focusMode) {
        setFocusMode(false);
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusMode]);

  const goChapter = useCallback(
    (next: number) => {
      const book = session.book;

      if (book === undefined) {
        return;
      }

      const chapter = clamp(next, 0, book.chapters.length - 1);
      setSession((current) => ({ ...current, chapter }));
      const entry = book.chapters[chapter];

      if (entry !== undefined) {
        reportProgress(entry.id, 0, true);
      }
    },
    [reportProgress, session.book],
  );

  if (file === undefined || downloadUrl === undefined) {
    return (
      <ErrorState
        error={createAppError('unsupported-format', 'No book this app can read.')}
        title="No book to read"
      />
    );
  }

  if (session.status === 'error') {
    return (
      <div className={styles.viewer}>
        <ErrorState
          error={createAppError('network', session.detail ?? 'The book could not be opened.')}
          title="Book could not be read"
        />
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
    );
  }

  if (session.status !== 'ready' || session.book === undefined) {
    return <LoadingState label="Opening book…" />;
  }

  const book = session.book;
  const chapter = book.chapters[session.chapter] ?? book.chapters[0];

  if (chapter === undefined) {
    return (
      <ErrorState
        error={createAppError('invalid-response', 'This book has no readable chapters.')}
        title="No chapters"
      />
    );
  }

  const canGoPrevious = session.chapter > 0;
  const canGoNext = session.chapter < book.chapters.length - 1;

  return (
    <div className={styles.viewer} data-focus={focusMode ? 'true' : 'false'}>
      <div className={styles.toolbar} role="toolbar" aria-label="Book reader" hidden={focusMode}>
        <div className={styles.group}>
          <Button
            onClick={() => goChapter(session.chapter - 1)}
            disabled={!canGoPrevious}
            aria-label="Previous chapter"
          >
            Previous
          </Button>
          <Button
            onClick={() => goChapter(session.chapter + 1)}
            disabled={!canGoNext}
            aria-label="Next chapter"
          >
            Next
          </Button>
          <p className={styles.status} aria-live="polite">
            {chapter.title}
            {book.chapters.length > 1
              ? ` · ${String(session.chapter + 1)} of ${String(book.chapters.length)}`
              : ''}
          </p>
        </div>

        {book.chapters.length > 1 ? (
          <label className={styles.field} htmlFor={tocId}>
            Contents
            <select
              id={tocId}
              className={styles.select}
              value={chapter.id}
              onChange={(event) => {
                const next = book.chapters.findIndex((entry) => entry.id === event.target.value);
                if (next !== -1) {
                  goChapter(next);
                }
              }}
            >
              {book.chapters.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className={styles.field} htmlFor={fontId}>
          Text size
          <select
            id={fontId}
            className={styles.select}
            value={String(fontSize)}
            onChange={(event) => setFontSize(Number(event.target.value))}
          >
            {FONT_SIZES.map((size) => (
              <option key={size} value={String(size)}>
                {`${String(size)} px`}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field} htmlFor={spacingId}>
          Spacing
          <select
            id={spacingId}
            className={styles.select}
            value={String(lineHeight)}
            onChange={(event) => setLineHeight(Number(event.target.value))}
          >
            {LINE_HEIGHTS.map((value) => (
              <option key={value} value={String(value)}>
                {`${value.toFixed(1)} ×`}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field} htmlFor={themeId}>
          Theme
          <select
            id={themeId}
            className={styles.select}
            value={theme}
            onChange={(event) => setTheme(event.target.value as Theme)}
          >
            <option value="dark">Dark</option>
            <option value="sepia">Sepia</option>
            <option value="light">Light</option>
          </select>
        </label>

        <label className={styles.field} htmlFor={searchId}>
          Search
          <input
            id={searchId}
            className={styles.search}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="In this chapter"
          />
        </label>

        <Button pressed={focusMode} aria-pressed={focusMode} onClick={() => setFocusMode(true)}>
          Focus
        </Button>

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

      {focusMode ? (
        <div className={styles.focusBar}>
          <Button onClick={() => setFocusMode(false)}>Show controls</Button>
        </div>
      ) : null}

      <article
        ref={articleRef}
        className={styles.page}
        data-theme={theme}
        style={{ fontSize: `${String(fontSize)}px`, lineHeight }}
        onScroll={(event) => {
          const node = event.currentTarget;
          const max = node.scrollHeight - node.clientHeight;
          const percent = max > 0 ? (node.scrollTop / max) * 100 : 0;
          reportProgress(chapter.id, percent, false);
        }}
      >
        <h2 className={styles.chapterTitle}>{chapter.title}</h2>
        <p className={styles.body}>{renderWithMatches(chapter.text, query)}</p>
      </article>

      <p className={styles.hint} hidden={focusMode}>
        {item.title}. This reader shows the book’s text. Markup and illustrations stay in the
        downloadable file. Opening needs permission to fetch the EPUB; a blocked or oversized file
        is not proxied.
      </p>
    </div>
  );
}
