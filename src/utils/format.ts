/**
 * Presentation formatting for provider values.
 *
 * Kept separate from the models: byte sizes and counts arrive as numbers (or not at all), and how
 * they read is a view concern. Every function returns `undefined` rather than a placeholder when
 * the input is missing, so callers can drop the whole row instead of printing "0" or "—" for
 * something the provider never supplied.
 */

const UNITS: readonly string[] = ['B', 'KB', 'MB', 'GB', 'TB'];

/** Human-readable file size using 1024-based units, the convention file listings use. */
export function formatByteSize(bytes: number | undefined): string | undefined {
  if (bytes === undefined || !Number.isFinite(bytes) || bytes < 0) {
    return undefined;
  }

  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < UNITS.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const rounded = unitIndex === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  const unit = UNITS[unitIndex] ?? 'B';

  return `${rounded.toLocaleString('en-US', { maximumFractionDigits: 1 })} ${unit}`;
}

/** "1 item" / "4,210 items", or `undefined` when the count is unknown. */
export function formatItemCount(count: number | undefined): string | undefined {
  if (count === undefined || !Number.isFinite(count) || count < 0) {
    return undefined;
  }

  const rounded = Math.trunc(count);

  return `${rounded.toLocaleString('en-US')} ${rounded === 1 ? 'item' : 'items'}`;
}

/** Sum of the sizes we actually know, or `undefined` when none are known. */
export function sumKnownSizes(sizes: readonly (number | undefined)[]): number | undefined {
  const known = sizes.filter((size): size is number => size !== undefined);

  return known.length === 0 ? undefined : known.reduce((total, size) => total + size, 0);
}
