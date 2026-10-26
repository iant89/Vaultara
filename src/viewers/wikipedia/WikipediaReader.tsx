import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingState } from '../../components/feedback/LoadingState';
import { isSafeDownloadUrl } from '../../downloads/describe';
import { createAppError } from '../../models/errors';
import type { ContentViewerProps } from '../../models/viewer';
import type { WikipediaLangLink } from '../../providers/wikipedia/types';
import { canReadWikipedia } from './isWikipediaFile';
import { describeArticleLoadFailure, loadArticle, type LoadedArticle } from './loadArticle';
import styles from './WikipediaReader.module.css';

export interface WikipediaReaderProps extends ContentViewerProps {
  readonly load?: (itemId: string, signal: AbortSignal) => Promise<LoadedArticle>;
}

function langLinksFrom(item: ContentViewerProps['item']): readonly WikipediaLangLink[] {
  const raw = item.metadata['langlinks'];

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter((entry): entry is WikipediaLangLink => {
    if (typeof entry !== 'object' || entry === null) {
      return false;
    }

    const record = entry as Record<string, unknown>;

    return (
      typeof record['lang'] === 'string' &&
      typeof record['title'] === 'string' &&
      typeof record['url'] === 'string'
    );
  });
}

/**
 * In-app Wikipedia reader (design spec 12.2, 18.9).
 *
 * Document layout, not a poster grid. Parse HTML is sanitised before insertion. Internal wiki
 * links navigate in-app; other language editions open on Wikipedia itself.
 */
export function WikipediaReader({
  item,
  files,
  activeFileId,
  load = loadArticle,
}: WikipediaReaderProps) {
  const navigate = useNavigate();
  const articles = useMemo(() => files.filter(canReadWikipedia), [files]);
  const file = articles.find((entry) => entry.id === activeFileId) ?? articles[0];
  const downloadUrl =
    file !== undefined && isSafeDownloadUrl(file.downloadUrl) ? file.downloadUrl : undefined;
  const languages = langLinksFrom(item);
  const [session, setSession] = useState<{
    readonly id: string;
    readonly status: 'loading' | 'ready' | 'error';
    readonly article?: LoadedArticle;
    readonly error?: unknown;
  }>({ id: item.id, status: 'loading' });

  if (session.id !== item.id) {
    setSession({ id: item.id, status: 'loading' });
  }

  useEffect(() => {
    const controller = new AbortController();

    void load(item.id, controller.signal)
      .then((article) => {
        if (!controller.signal.aborted) {
          setSession({ id: item.id, status: 'ready', article });
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setSession({ id: item.id, status: 'error', error });
        }
      });

    return () => {
      controller.abort();
    };
  }, [item.id, load]);

  function handleClick(event: MouseEvent<HTMLElement>) {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const anchor = target.closest('a');

    if (anchor === null) {
      return;
    }

    const href = anchor.getAttribute('href');

    if (href === null) {
      return;
    }

    if (href.startsWith('#')) {
      event.preventDefault();
      document.getElementById(href.slice(1))?.scrollIntoView();
      return;
    }

    if (href.startsWith('/item/') || href.startsWith('/collection/')) {
      event.preventDefault();
      const [path, hash] = href.split('#');

      if (path !== undefined) {
        void navigate(path);
      }

      if (hash !== undefined && hash.length > 0) {
        requestAnimationFrame(() => {
          document.getElementById(hash)?.scrollIntoView();
        });
      }
    }
  }

  if (file === undefined) {
    return (
      <ErrorState
        error={createAppError('unsupported-format', 'Wikipedia did not provide a readable copy.')}
        title="This article cannot be opened"
      />
    );
  }

  if (session.status === 'loading') {
    return <LoadingState label="Loading article…" />;
  }

  if (session.status === 'error' || session.article === undefined) {
    return (
      <div className={styles.failed}>
        <ErrorState
          error={createAppError('invalid-response', describeArticleLoadFailure(session.error))}
          title="This article could not be opened"
        />
        {downloadUrl !== undefined ? (
          <a
            className={styles.original}
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            View original on Wikipedia
          </a>
        ) : null}
      </div>
    );
  }

  const article = session.article;

  return (
    <div className={styles.viewer}>
      <header className={styles.toolbar} role="toolbar" aria-label="Wikipedia reader">
        <p className={styles.lede}>
          Extracted from Wikipedia. Scripts and unsafe markup are removed. The original article
          remains on Wikipedia.
        </p>
        {downloadUrl !== undefined ? (
          <a
            className={styles.original}
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Original article
          </a>
        ) : null}
      </header>

      <div className={styles.layout}>
        {article.sections.length > 0 ? (
          <nav className={styles.toc} aria-label="Table of contents">
            <h2 className={styles.tocTitle}>Contents</h2>
            <ol>
              {article.sections.map((section) => (
                <li key={section.anchor} className={styles[`level${Math.min(section.level, 3)}`]}>
                  <a href={`#${section.anchor}`}>{section.line}</a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        <article className={styles.article} aria-label={article.displayTitle}>
          <h2 className={styles.title}>{article.displayTitle}</h2>
          {item.description !== undefined ? (
            <p className={styles.summary}>{item.description}</p>
          ) : null}
          {/* Delegated so sanitised wiki links honour the router basename. The anchors remain the keyboard targets. */}
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
          <div
            className={styles.body}
            dangerouslySetInnerHTML={{ __html: article.html }}
            onClick={handleClick}
          />
        </article>
      </div>

      {languages.length > 0 ? (
        <section className={styles.languages} aria-label="Other languages">
          <h2 className={styles.tocTitle}>Other languages</h2>
          <ul>
            {languages.map((entry) => (
              <li key={entry.lang}>
                <a href={entry.url} target="_blank" rel="noopener noreferrer">
                  {entry.lang}: {entry.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
