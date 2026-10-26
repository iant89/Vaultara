import { useId } from 'react';
import type { ReactNode } from 'react';
import type { AsyncState } from '../../data/useAsyncValue';
import type { ContentItem } from '../../models/content';
import type { PaginatedResult } from '../../models/pagination';
import { getProviderName } from '../../config/providers';
import { ErrorState } from '../feedback/ErrorState';
import { ContentRow } from '../ui/ContentRow';
import { ItemCard } from '../ui/ItemCard';
import { SkeletonCard, SkeletonGroup } from '../ui/Skeleton';
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
  viewAllLabel,
  state,
  reload,
  emptyMessage = 'Nothing to show here yet.',
  skeletonCount = 6,
}: ItemRowProps) {
  const headingId = useId();

  if (state.status !== 'ready') {
    return (
      <section className={styles.row} aria-labelledby={headingId}>
        <div className={styles.header}>
          <h2 id={headingId} className={styles.title}>
            {title}
          </h2>
          {description !== undefined ? <p className={styles.description}>{description}</p> : null}
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
