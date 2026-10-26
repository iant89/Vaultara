import { toAppError } from '../../models/errors';
import { Button } from '../ui/Button';
import { AlertIcon } from '../ui/icons';
import styles from './Feedback.module.css';

interface ErrorStateProps {
  readonly error: unknown;
  readonly title?: string;
  readonly onRetry?: () => void;
  readonly retryLabel?: string;
}

/**
 * Renders any thrown value as a recoverable failure. The message explains what happened and,
 * where the caller can retry, offers a recovery action (design spec 28).
 */
export function ErrorState({
  error,
  title = 'Something went wrong',
  onRetry,
  retryLabel = 'Try again',
}: ErrorStateProps) {
  const appError = toAppError(error);

  return (
    <div className={styles.panel} role="alert">
      <div className={styles.headingRow}>
        <AlertIcon className={styles.errorIcon} />
        <p className={styles.panelTitle}>{title}</p>
      </div>
      <p className={styles.panelText}>{appError.message}</p>
      {onRetry ? (
        <Button variant="secondary" className={styles.action} onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
