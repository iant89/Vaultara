import { InfoIcon } from '../ui/icons';
import styles from './Feedback.module.css';

interface NotYetImplementedProps {
  readonly feature: string;
  readonly summary: string;
  readonly plannedPhase: string;
}

/**
 * Explicit statement that a screen exists only as a route.
 *
 * The repository has no provider, viewer, or persistence implementation yet, so pages must
 * say so rather than present inactive controls as working features (roadmap quality gates).
 * The status is carried by text, not by colour alone.
 */
export function NotYetImplemented({ feature, summary, plannedPhase }: NotYetImplementedProps) {
  return (
    <div className={styles.panel}>
      <p className={styles.statusLine}>
        <InfoIcon className={styles.statusIcon} width={14} height={14} />
        Not implemented
      </p>
      <p className={styles.panelTitle}>{feature} is not available yet</p>
      <p className={styles.panelText}>{summary}</p>
      <p className={styles.panelMeta}>Planned in {plannedPhase} of the development roadmap.</p>
    </div>
  );
}
