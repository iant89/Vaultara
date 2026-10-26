import { Link } from 'react-router-dom';
import styles from './Pagination.module.css';

interface PaginationProps {
  readonly page: number;
  /** Whether the provider reported more results after this page. */
  readonly hasMore: boolean;
  /** Builds the href for a page, so paging is a real link (shareable, back-button friendly). */
  readonly buildHref: (page: number) => string;
  readonly label?: string;
}

/**
 * Previous/next paging for a grid (design spec 5.5).
 *
 * Rendered as links rather than buttons so a page can be opened in a new tab, bookmarked, and
 * reached with the browser's back button. Nothing is shown when there is nowhere to go.
 */
export function Pagination({ page, hasMore, buildHref, label = 'Pagination' }: PaginationProps) {
  const hasPrevious = page > 1;

  if (!hasPrevious && !hasMore) {
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

      <p className={styles.status}>Page {page}</p>

      <div className={`${styles.slot} ${styles.slotEnd}`}>
        {hasMore ? (
          <Link to={buildHref(page + 1)} className={styles.link} rel="next">
            Next <span aria-hidden="true">→</span>
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
