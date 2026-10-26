import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';
import styles from './ResponsiveGrid.module.css';

interface ResponsiveGridProps {
  readonly children: ReactNode;
  /** Accessible name for the list of cards. */
  readonly label?: string;
  /** Wider minimum column, for collection cards and detail layouts. */
  readonly wide?: boolean;
  readonly className?: string;
}

/**
 * Fluid card grid used by category, collection, and favourites pages (design spec 5.5, 8.2).
 *
 * Auto-fill with a minimum column width adapts to the container without breakpoint churn,
 * which also avoids horizontal overflow on narrow viewports.
 */
export function ResponsiveGrid({ children, label, wide = false, className }: ResponsiveGridProps) {
  return (
    <ul className={cx(styles.grid, wide && styles.wide, className)} aria-label={label}>
      {children}
    </ul>
  );
}
