import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { LoadingState } from '../feedback/LoadingState';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  readonly width?: string;
  readonly height?: string;
  readonly className?: string;
}

/**
 * A single placeholder shape.
 *
 * Always `aria-hidden`: placeholders carry no meaning for assistive technology. The region
 * they live in announces a single polite status message instead, so a screen reader hears
 * "Loading" once rather than a stream of empty boxes.
 */
export function Skeleton({ width, height, className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cx(styles.skeleton, styles.text, className)}
      style={{ width, height }}
    />
  );
}

export function SkeletonText({ width, className }: SkeletonProps) {
  return <Skeleton width={width} className={cx(styles.text, className)} />;
}

export function SkeletonTitle({ width = '65%' }: { readonly width?: string }) {
  return <Skeleton width={width} className={styles.title} />;
}

export function SkeletonMedia() {
  return <Skeleton className={styles.media} />;
}

/** A card-shaped placeholder matching ItemCard's proportions. */
export function SkeletonCard() {
  return (
    <div className={styles.card} aria-hidden="true">
      <Skeleton className={styles.media} />
      <Skeleton width="80%" className={styles.title} />
      <Skeleton width="50%" />
    </div>
  );
}

interface SkeletonGroupProps {
  readonly label?: string;
  readonly children: ReactNode;
}

/**
 * Wraps placeholders in one announced status region. Use one group per loading area rather
 * than one per card.
 */
export function SkeletonGroup({ label = 'Loading content…', children }: SkeletonGroupProps) {
  return (
    <div className={styles.group} role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export { LoadingState };
