import type { CSSProperties } from 'react';
import { cx } from '../../utils/cx';
import styles from './ProviderBadge.module.css';

/** Providers with a defined identity colour. Unknown providers fall back to neutral. */
const PROVIDER_SWATCH: Readonly<Record<string, string>> = {
  archive: 'var(--color-provider-archive)',
  wikipedia: 'var(--color-provider-wikipedia)',
  adult: 'var(--color-provider-adult)',
  sample: 'var(--color-provider-sample)',
};

interface ProviderBadgeProps {
  readonly providerId: string;
  readonly providerName: string;
  /** Drops the pill chrome, for dense card footers. */
  readonly compact?: boolean;
}

/**
 * Identifies which provider content came from.
 *
 * Design spec section 15.3 requires every result to identify its source provider. The name
 * is always rendered as text; the colour swatch is decorative so that colour is never the
 * only carrier of meaning (design spec section 27).
 */
export function ProviderBadge({ providerId, providerName, compact = false }: ProviderBadgeProps) {
  const swatchColor = PROVIDER_SWATCH[providerId] ?? 'var(--color-text-subtle)';

  return (
    <span className={cx(styles.badge, compact && styles.compact)}>
      <span
        className={styles.swatch}
        style={{ '--swatch-color': swatchColor } as CSSProperties}
        data-testid="provider-swatch"
      />
      <span className={styles.badgeLabel}>{providerName}</span>
    </span>
  );
}
