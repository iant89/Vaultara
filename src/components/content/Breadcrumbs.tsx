import { Link } from 'react-router-dom';
import styles from './Breadcrumbs.module.css';

export interface Crumb {
  readonly label: string;
  /** Omit on the final crumb: the current page is not a link to itself. */
  readonly to?: string;
}

interface BreadcrumbsProps {
  readonly items: readonly Crumb[];
}

/**
 * Trail back to the top of the hierarchy (design spec 5.4).
 *
 * The last crumb is the current page and is marked with `aria-current="page"` rather than
 * rendered as a link to itself. Separators are CSS-generated, so they are not read aloud.
 */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={styles.nav}>
      <ol className={styles.list}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}:${String(index)}`} className={styles.item}>
              {item.to !== undefined && !isLast ? (
                <Link to={item.to} className={styles.link}>
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? 'page' : undefined} className={styles.current}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
