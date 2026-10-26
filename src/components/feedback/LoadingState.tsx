import styles from './Feedback.module.css';

interface LoadingStateProps {
  readonly label?: string;
}

/** Announced to assistive technology through a live status region. */
export function LoadingState({ label = 'Loading…' }: LoadingStateProps) {
  return (
    <div className={styles.status} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
