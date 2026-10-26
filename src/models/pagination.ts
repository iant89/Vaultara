/**
 * Pagination contracts shared by every provider adapter.
 *
 * Providers translate their own paging mechanisms (offsets, cursors, page tokens) into
 * these types so the application core never needs provider-specific paging logic.
 */

export interface PaginationOptions {
  readonly page?: number;
  readonly pageSize?: number;
  readonly cursor?: string;
}

export interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly total?: number;
  readonly nextCursor?: string;
  readonly hasMore: boolean;
}

/** Cards per category row target 20-30 items (design spec 5.2); 24 is a safe default. */
export const DEFAULT_PAGE_SIZE = 24;

/** Guard rail so a malformed provider or URL cannot request thousands of items at once. */
export const MAX_PAGE_SIZE = 100;

export interface ResolvedPaginationOptions {
  readonly page: number;
  readonly pageSize: number;
  readonly cursor?: string;
}

function toPositiveInteger(value: number | undefined, fallback: number, max?: number): number {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }

  const normalized = Math.trunc(value);
  if (normalized < 1) {
    return 1;
  }

  return max === undefined ? normalized : Math.min(normalized, max);
}

/**
 * Normalize untrusted pagination input (typically from URL parameters) into usable
 * values. Out-of-range values are clamped rather than rejected so a bad link degrades
 * to a sensible first page instead of an error.
 */
export function resolvePaginationOptions(
  options: PaginationOptions = {},
): ResolvedPaginationOptions {
  const cursor = options.cursor?.trim();

  return {
    page: toPositiveInteger(options.page, 1),
    pageSize: toPositiveInteger(options.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
    ...(cursor !== undefined && cursor.length > 0 ? { cursor } : {}),
  };
}

export function calculateOffset(page: number, pageSize: number): number {
  const safePage = Math.max(1, Math.trunc(page));
  const safePageSize = Math.max(1, Math.trunc(pageSize));
  return (safePage - 1) * safePageSize;
}

export function calculatePageCount(total: number, pageSize: number): number {
  if (!Number.isFinite(total) || total <= 0) {
    return 0;
  }

  const safePageSize = Math.max(1, Math.trunc(pageSize));
  return Math.ceil(total / safePageSize);
}

export interface CreatePaginatedResultOptions extends ResolvedPaginationOptions {
  readonly total?: number;
  readonly nextCursor?: string;
}

/**
 * Assemble a paginated result. When neither `total` nor `nextCursor` is known, `hasMore`
 * is inferred optimistically from a full page of items; callers that can determine
 * availability precisely should pass `total` or `nextCursor`.
 */
export function createPaginatedResult<T>(
  items: readonly T[],
  options: CreatePaginatedResultOptions,
): PaginatedResult<T> {
  const hasMore =
    options.nextCursor !== undefined
      ? true
      : options.total !== undefined
        ? calculateOffset(options.page, options.pageSize) + items.length < options.total
        : options.pageSize > 0 && items.length >= options.pageSize;

  return {
    items,
    page: options.page,
    pageSize: options.pageSize,
    ...(options.total !== undefined ? { total: options.total } : {}),
    ...(options.nextCursor !== undefined ? { nextCursor: options.nextCursor } : {}),
    hasMore,
  };
}
