import { useId } from 'react';
import type { ReactNode } from 'react';
import styles from './Section.module.css';

interface SectionProps {
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
  readonly children: ReactNode;
}

/**
 * A headed block within a page: metadata, files, categories.
 *
 * Takes an `h2` and labels itself with it, so each region becomes a landmark that screen-reader
 * users can jump between rather than one long run of text.
 */
export function Section({ title, description, action, children }: SectionProps) {
  const headingId = useId();

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <div className={styles.header}>
        <div className={styles.headingGroup}>
          <h2 id={headingId} className={styles.title}>
            {title}
          </h2>
          {description !== undefined ? <p className={styles.description}>{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
