import { useId } from 'react';
import type { ReactNode } from 'react';
import styles from './Page.module.css';

interface PageProps {
  readonly title: string;
  readonly intro?: string;
  readonly children?: ReactNode;
}

/**
 * Standard page frame: one `h1` per route, labelling the section landmark it introduces.
 * Nested settings sections use their own `h2` headings instead of nesting `Page`.
 */
export function Page({ title, intro, children }: PageProps) {
  const headingId = useId();

  return (
    <section className={styles.page} aria-labelledby={headingId}>
      <header className={styles.header}>
        <h1 id={headingId} className={styles.title}>
          {title}
        </h1>
        {intro ? <p className={styles.intro}>{intro}</p> : null}
      </header>
      {children}
    </section>
  );
}
