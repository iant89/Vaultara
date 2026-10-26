import type { ReactNode } from 'react';
import styles from './Feedback.module.css';

interface EmptyStateProps {
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
}

/** Used when a request succeeded but produced nothing to show, or a feature is absent. */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.panel}>
      <p className={styles.panelTitle}>{title}</p>
      {description ? <p className={styles.panelText}>{description}</p> : null}
      {action}
    </div>
  );
}
