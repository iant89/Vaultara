import { useId } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { getProviderName } from '../../config/providers';
import type { AsyncState } from '../../data/useAsyncValue';
import type { ContentItem } from '../../models/content';
import type { PaginatedResult } from '../../models/pagination';
import { ErrorState } from '../feedback/ErrorState';
import { ContentRow } from '../ui/ContentRow';
import { ArrowRightIcon } from '../ui/icons';
import { ItemCard } from '../ui/ItemCard';
import { Skeleton, SkeletonCard, SkeletonGroup } from '../ui/Skeleton';
import styles from './ItemRow.module.css';

interface ItemRowProps {
  readonly title: string;
  readonly description?: string;
  readonly viewAllHref?: string;
  readonly viewAllLabel?: string;
  readonly state: AsyncState<PaginatedResult<ContentItem>>;
  readonly reload: () => void;
  readonly emptyMessage?: ReactNode;
  readonly skeletonCount?: number;
  readonly headingLevel?: 2 | 3;
}

/**
 * A discovery row backed by one request.
 *
 * The row is self-contained on purpose: a row that fails reports its own failure and retry, and
 * the rest of the page stays usable. That is the visible form of provider failure isolation — one
 * bad request cannot blank the home page.
 */
export function ItemRow({
  title,
  description,
  viewAllHref,
  viewAllLabel = 'View all',
  state,
  reload,
  emptyMessage = 'Nothing to show here yet.',
  skeletonCount = 6,
  headingLevel = 2,
}: ItemRowProps) {
  const headingId = useId();
  const Heading = headingLevel === 3 ? 'h3' : 'h2';

  if (state.status !== 'ready') {
    return (
      <section className={styles.row} aria-labelledby={headingId}>
        <div className={styles.header}>
          <div>
            <Heading id={headingId} className={styles.title}>
              {viewAllHref !== undefined ? (
                <Link to={viewAllHref} className={styles.titleLink}>
                  {title}
                </Link>
              ) : (
                title
              )}
            </Heading>
            {description !== undefined ? <p className={styles.description}>{description}</p> : null}
          </div>
          {viewAllHref !== undefined ? (
            <Link to={viewAllHref} className={styles.viewAll}>
              {viewAllLabel}
              <ArrowRightIcon width={16} height={16} />
            </Link>
          ) : null}
        </div>

        {state.status === 'loading' ? (
          <SkeletonGroup label={`Loading ${title}`}>
            {/* Placeholders live outside a list element: they are decorative shapes, not items. */}
            <div className={styles.skeletonTrack}>
              {Array.from({ length: skeletonCount }, (_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          </SkeletonGroup>
        ) : (
          <ErrorState error={state.error} title="This row could not be loaded" onRetry={reload} />
        )}
      </section>
    );
  }

  const { items } = state.value;

  return (
    <ContentRow
      title={title}
      headingLevel={headingLevel}
      {...(description !== undefined ? { description } : {})}
      {...(viewAllHref !== undefined ? { viewAllHref } : {})}
      {...(viewAllLabel !== undefined ? { viewAllLabel } : {})}
      itemCount={items.length}
      emptyMessage={emptyMessage}
    >
      {items.map((item) => (
        <ItemCard key={item.id} item={item} providerName={getProviderName(item.providerId)} />
      ))}
    </ContentRow>
  );
}

/**
 * Placeholder rows matching a loaded shelf's shape so a category page does not jump when the
 * first collections arrive (design spec 25).
 */
export function RowSkeleton({
  label = 'Loading rows',
  rows = 3,
  skeletonCount = 6,
}: {
  readonly label?: string;
  readonly rows?: number;
  readonly skeletonCount?: number;
}) {
  return (
    <SkeletonGroup label={label}>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className={styles.row}>
          <div className={styles.header}>
            <Skeleton width="10rem" height="1.25rem" />
          </div>
          <div className={styles.skeletonTrack}>
            {Array.from({ length: skeletonCount }, (_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        </div>
      ))}
    </SkeletonGroup>
  );
}
