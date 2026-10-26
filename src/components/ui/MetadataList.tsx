import styles from './MetadataList.module.css';

export interface MetadataEntry {
  readonly label: string;
  readonly value: string | number | undefined | null;
}

interface MetadataListProps {
  readonly entries: readonly MetadataEntry[];
  readonly label?: string;
}

/**
 * Term/definition pairs for item metadata.
 *
 * Uses `dl`/`dt`/`dd` so screen readers announce the relationship between label and value,
 * and drops entries whose value is absent rather than rendering empty rows
 * (design spec 9.3: only show sections when relevant data exists).
 */
export function MetadataList({ entries, label }: MetadataListProps) {
  const present = entries.filter(
    (entry): entry is { label: string; value: string | number } =>
      entry.value !== undefined && entry.value !== null && String(entry.value).trim().length > 0,
  );

  if (present.length === 0) {
    return null;
  }

  return (
    <dl className={styles.list} aria-label={label}>
      {present.map((entry) => (
        <div key={entry.label} className={styles.pair}>
          <dt className={styles.term}>{entry.label}</dt>
          <dd className={styles.value}>{entry.value}</dd>
        </div>
      ))}
    </dl>
  );
}
