export type ClassValue = string | false | null | undefined;

/** Join conditional class names, dropping empty values. */
export function cx(...values: readonly ClassValue[]): string {
  return values
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' ');
}
