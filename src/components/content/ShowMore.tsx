import type { AppError } from '../../models/errors';
import { ErrorState } from '../feedback/ErrorState';
import { Button } from '../ui/Button';
import styles from './ShowMore.module.css';

interface ShowMoreProps {
  /** Entries currently on screen. */
  readonly shown: number;
  /** Provider-reported total, when there is one. */
  readonly total?: number | undefined;
  /** Plural noun for the status line: "items", "collections". */
  readonly noun: string;
  /**
   * What the button adds, used as its accessible name ("View more nested collections").
   * A page can show several of these lists, and two buttons with the same name would be
   * indistinguishable to a screen reader.
   */
  readonly scope: string;
  readonly hasMore: boolean;
  readonly loading: boolean;
  readonly error?: AppError | undefined;
  readonly onLoadMore: () => void;
}

/**
 * The end of a list that has more behind it.
 *
 * Deliberately a button, not an automatic scroll trigger: the reader chooses whether to fetch
 * more, keyboard focus and the back button keep behaving, and nobody pays for bandwidth they did
 * not ask for. Nothing renders when the list is complete (design spec 9.3) — except a failed
 * append, which is reported here so the entries already on screen stay usable.
 */
export function ShowMore({
  shown,
  total,
  noun,
  scope,
  hasMore,
  loading,
  error,
  onLoadMore,
}: ShowMoreProps) {
  if (error !== undefined) {
    return (
      <div className={styles.more}>
        <ErrorState
          error={error}
          title="Could not load more"
          onRetry={onLoadMore}
          retryLabel="Try again"
        />
      </div>
    );
  }

  if (!hasMore) {
    return null;
  }

  return (
    <div className={styles.more}>
      <p className={styles.status} aria-live="polite">
        {total !== undefined
          ? `Showing ${shown.toLocaleString('en-US')} of ${total.toLocaleString('en-US')} ${noun}`
          : `Showing ${shown.toLocaleString('en-US')} ${noun}`}
        {loading ? <span className={styles.loading}> · Loading more…</span> : null}
      </p>

      <Button
        variant="secondary"
        onClick={onLoadMore}
        disabled={loading}
        aria-busy={loading}
        aria-label={`View more ${scope}`}
      >
        View more
      </Button>
    </div>
  );
}
