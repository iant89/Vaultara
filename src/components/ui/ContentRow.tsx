import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';
import { Button } from './Button';
import { scrollBehavior } from '../../utils/motion';
import styles from './ContentRow.module.css';

interface ContentRowProps {
  readonly title: string;
  readonly description?: string;
  /** Rendered as a "View all" link; pass a full route path. */
  readonly viewAllHref?: string;
  readonly viewAllLabel?: string;
  readonly children: ReactNode;
  readonly headingLevel?: 2 | 3;
  /** Shown instead of the track when there is nothing to display. */
  readonly emptyMessage?: string;
  readonly itemCount?: number;
}

interface ScrollAvailability {
  readonly canScrollBack: boolean;
  readonly canScrollForward: boolean;
}

const NO_SCROLL: ScrollAvailability = { canScrollBack: false, canScrollForward: false };

/**
 * Horizontal, scrollable row of cards (design spec 5.2).
 *
 * Keyboard access comes from the cards themselves: every card contains a focusable link, and
 * focusing an off-screen card scrolls it into view natively. The prev/next buttons are real
 * buttons, so they are reachable by Tab as well. The track itself is deliberately *not*
 * given `tabindex`, because a scroll container is not an interactive control and lint-wise
 * (and for screen readers) a focusable non-interactive list is misleading.
 */
export function ContentRow({
  title,
  description,
  viewAllHref,
  viewAllLabel = 'View all',
  children,
  headingLevel = 2,
  emptyMessage = 'Nothing to show here yet.',
  itemCount,
}: ContentRowProps) {
  const titleId = useId();
  const trackId = useId();
  const trackRef = useRef<HTMLUListElement>(null);
  const [scroll, setScroll] = useState<ScrollAvailability>(NO_SCROLL);

  const updateScrollAvailability = useCallback(() => {
    const track = trackRef.current;
    if (track === null) {
      setScroll(NO_SCROLL);
      return;
    }

    const maxScrollLeft = track.scrollWidth - track.clientWidth;
    // A 1px tolerance absorbs sub-pixel rounding at non-integer zoom levels.
    setScroll({
      canScrollBack: track.scrollLeft > 1,
      canScrollForward: maxScrollLeft > 1 && track.scrollLeft < maxScrollLeft - 1,
    });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (track === null) {
      return undefined;
    }

    updateScrollAvailability();
    track.addEventListener('scroll', updateScrollAvailability, { passive: true });

    // ResizeObserver keeps the control state correct when the viewport or the number of
    // cards changes without a scroll event.
    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateScrollAvailability);
    resizeObserver?.observe(track);

    return () => {
      track.removeEventListener('scroll', updateScrollAvailability);
      resizeObserver?.disconnect();
    };
  }, [updateScrollAvailability, itemCount]);

  const scrollByPage = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (track === null) {
      return;
    }

    // Scroll by ~80% of a viewport so a hint of the next card stays visible.
    const distance = Math.max(160, Math.round(track.clientWidth * 0.8));
    track.scrollBy({ left: distance * direction, behavior: scrollBehavior() });
  };

  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  const hasItems = itemCount === undefined || itemCount > 0;

  return (
    <section className={styles.row} aria-labelledby={titleId}>
      <div className={styles.header}>
        <div>
          <Heading id={titleId} className={styles.title}>
            {title}
          </Heading>
          {description ? <p className={styles.description}>{description}</p> : null}
        </div>
        {viewAllHref ? (
          <Link to={viewAllHref} className={styles.viewAll}>
            {viewAllLabel}
            <ArrowRightIcon width={16} height={16} />
          </Link>
        ) : null}
      </div>

      {hasItems ? (
        <div className={styles.trackWrapper}>
          {scroll.canScrollBack ? (
            <Button
              variant="icon"
              className={`${styles.scrollButton} ${styles.prev}`}
              aria-label={`Scroll ${title} backward`}
              aria-controls={trackId}
              onClick={() => {
                scrollByPage(-1);
              }}
            >
              <ChevronLeftIcon />
            </Button>
          ) : null}

          <ul ref={trackRef} id={trackId} className={styles.track} aria-labelledby={titleId}>
            {children}
          </ul>

          {scroll.canScrollForward ? (
            <Button
              variant="icon"
              className={`${styles.scrollButton} ${styles.next}`}
              aria-label={`Scroll ${title} forward`}
              aria-controls={trackId}
              onClick={() => {
                scrollByPage(1);
              }}
            >
              <ChevronRightIcon />
            </Button>
          ) : null}
        </div>
      ) : (
        <p className={styles.emptyTrack}>{emptyMessage}</p>
      )}
    </section>
  );
}
