import { Link } from 'react-router-dom';
import { calculatePageCount } from '../../models/pagination';
import styles from './Pagination.module.css';

interface PaginationProps {
  readonly page: number;
  /** Whether the provider reported more results after this page. */
  readonly hasMore: boolean;
  /** Builds the href for a page, so paging is a real link (shareable, back-button friendly). */
  readonly buildHref: (page: number) => string;
  readonly label?: string;
  /** Provider-reported total, when there is one. With `pageSize` it produces numbered pages. */
  readonly total?: number;
  readonly pageSize?: number;
}

/** Pages shown either side of the current one before the list starts abbreviating. */
const NEIGHBOURS = 1;

/**
 * Page numbers with first/last anchors, e.g. `1 … 4 5 6 … 176`.
 *
 * `null` marks an ellipsis. Kept as a pure function so the shape is testable without rendering.
 */
export function buildPageWindow(page: number, pageCount: number): readonly (number | null)[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const first = Math.max(2, page - NEIGHBOURS);
  const last = Math.min(pageCount - 1, page + NEIGHBOURS);
  const window: (number | null)[] = [1];

  if (first > 2) {
    window.push(null);
  }

  for (let candidate = first; candidate <= last; candidate += 1) {
    window.push(candidate);
  }

  if (last < pageCount - 1) {
    window.push(null);
  }

  window.push(pageCount);

  return window;
}

/**
 * Paging for a grid (design spec 5.5).
 *
 * Rendered as links rather than buttons so a page can be opened in a new tab, bookmarked, and
 * reached with the browser's back button. When the provider reports a total, the pages are
 * numbered with first/last anchors; without one there is only a previous/next pair and a page
 * number, because inventing a total would put an unreachable last page on screen.
 */
export function Pagination({
  page,
  hasMore,
  buildHref,
  label = 'Pagination',
  total,
  pageSize,
}: PaginationProps) {
  const pageCount =
    total !== undefined && pageSize !== undefined && pageSize > 0
      ? calculatePageCount(total, pageSize)
      : undefined;
  const hasPrevious = page > 1;
  const hasNext = pageCount !== undefined ? page < pageCount : hasMore;

  if (!hasPrevious && !hasNext) {
    return null;
  }

  return (
    <nav className={styles.nav} aria-label={label}>
      <div className={styles.slot}>
        {hasPrevious ? (
          <Link to={buildHref(page - 1)} className={styles.link} rel="prev">
            <span aria-hidden="true">←</span> Previous
          </Link>
        ) : null}
      </div>

      <div className={styles.pagesSlot}>
        {pageCount !== undefined ? (
          <>
            <p className="sr-only">
              Page {page} of {pageCount}
            </p>
            <ol className={styles.pages} aria-label="Pages">
              {buildPageWindow(page, pageCount).map((entry, index) =>
                entry === null ? (
                  <li key={`gap-${String(index)}`} className={styles.gap} aria-hidden="true">
                    …
                  </li>
                ) : (
                  <li key={entry}>
                    {entry === page ? (
                      <span className={styles.current} aria-current="page">
                        {entry}
                      </span>
                    ) : (
                      <Link to={buildHref(entry)} className={styles.page}>
                        {entry}
                      </Link>
                    )}
                  </li>
                ),
              )}
            </ol>
          </>
        ) : (
          <p className={styles.status}>Page {page}</p>
        )}
      </div>

      <div className={`${styles.slot} ${styles.slotEnd}`}>
        {hasNext ? (
          <Link to={buildHref(page + 1)} className={styles.link} rel="next">
            Next <span aria-hidden="true">→</span>
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
