import { useId } from 'react';
import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';
import styles from './Page.module.css';

interface PageProps {
  readonly title: string;
  readonly intro?: string;
  readonly children?: ReactNode;
  /** Breadcrumb trail, rendered above the heading. */
  readonly breadcrumbs?: ReactNode;
  /** Artwork or other media shown beside the heading, e.g. an item thumbnail. */
  readonly media?: ReactNode;
  /** Badges and counts shown under the intro. */
  readonly meta?: ReactNode;
}

/**
 * Standard page frame: one `h1` per route, labelling the section landmark it introduces.
 * Nested settings sections use their own `h2` headings instead of nesting `Page`.
 *
 * `media` and `meta` exist for detail pages, where a bare heading would waste the most
 * prominent area of the screen. They change the layout, not the structure: the heading is still
 * the first child of the header, so the reading order stays title → description → detail.
 */
export function Page({ title, intro, children, breadcrumbs, media, meta }: PageProps) {
  const headingId = useId();
  const hasMedia = media !== undefined;

  return (
    <section className={styles.page} aria-labelledby={headingId}>
      <header className={cx(styles.header, hasMedia && styles.withMedia)}>
        {breadcrumbs !== undefined ? <div className={styles.breadcrumbs}>{breadcrumbs}</div> : null}
        {hasMedia ? <div className={styles.media}>{media}</div> : null}
        <div className={styles.heading}>
          <h1 id={headingId} className={styles.title}>
            {title}
          </h1>
          {intro ? <p className={styles.intro}>{intro}</p> : null}
          {meta !== undefined ? <div className={styles.meta}>{meta}</div> : null}
        </div>
      </header>
      {children}
    </section>
  );
}
