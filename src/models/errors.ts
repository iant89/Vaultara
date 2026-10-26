/**
 * Standardized error model.
 *
 * Provider failures must be isolated and presentable (design spec 28). Adapters normalize
 * whatever they catch into an `AppError` so the core can distinguish a rate limit from a
 * cancellation without inspecting provider-specific error shapes.
 */

export type AppErrorKind =
  | 'provider-unavailable'
  | 'rate-limited'
  | 'network'
  | 'timeout'
  | 'cancelled'
  | 'not-found'
  | 'unauthorized'
  | 'invalid-response'
  | 'unsupported-format'
  | 'download-unavailable'
  | 'unknown';

const APP_ERROR_KINDS: ReadonlySet<string> = new Set<AppErrorKind>([
  'provider-unavailable',
  'rate-limited',
  'network',
  'timeout',
  'cancelled',
  'not-found',
  'unauthorized',
  'invalid-response',
  'unsupported-format',
  'download-unavailable',
  'unknown',
]);

/** User-facing defaults. Messages must explain the situation, not just name the failure. */
const DEFAULT_MESSAGES: Readonly<Record<AppErrorKind, string>> = {
  'provider-unavailable': 'This provider is currently unavailable. Other providers are unaffected.',
  'rate-limited': 'This provider is receiving too many requests. Please try again shortly.',
  network: 'The network request failed. Check your connection and try again.',
  timeout: 'The request took too long to complete. Please try again.',
  cancelled: 'The request was cancelled.',
  'not-found': 'The requested content could not be found.',
  unauthorized: 'This content requires authorization that is not currently available.',
  'invalid-response': 'The provider returned data that could not be understood.',
  'unsupported-format': 'This content format is not supported by any available viewer.',
  'download-unavailable': 'This file cannot be downloaded.',
  unknown: 'Something went wrong. Please try again.',
};

export interface AppErrorOptions {
  readonly providerId?: string;
  readonly cause?: unknown;
}

export interface AppError {
  readonly kind: AppErrorKind;
  readonly message: string;
  readonly providerId?: string;
  readonly cause?: unknown;
}

export function createAppError(
  kind: AppErrorKind,
  message: string,
  options: AppErrorOptions = {},
): AppError {
  const trimmed = message.trim();

  return {
    kind,
    message: trimmed.length > 0 ? trimmed : DEFAULT_MESSAGES[kind],
    ...(options.providerId !== undefined ? { providerId: options.providerId } : {}),
    ...(options.cause !== undefined ? { cause: options.cause } : {}),
  };
}

export function getDefaultErrorMessage(kind: AppErrorKind): string {
  return DEFAULT_MESSAGES[kind];
}

export function isAppError(value: unknown): value is AppError {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as { kind?: unknown; message?: unknown };

  return (
    typeof candidate.kind === 'string' &&
    APP_ERROR_KINDS.has(candidate.kind) &&
    typeof candidate.message === 'string'
  );
}

function isAbortError(error: unknown): boolean {
  return (
    typeof DOMException !== 'undefined' &&
    error instanceof DOMException &&
    error.name === 'AbortError'
  );
}

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === 'TimeoutError';
}

/**
 * Convert an unknown thrown value into an `AppError`.
 *
 * Already-normalized errors pass through unchanged; aborted requests become
 * `cancelled` so callers can distinguish an intentional cancellation from a failure.
 */
export function toAppError(error: unknown, fallbackKind: AppErrorKind = 'unknown'): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (isAbortError(error)) {
    return createAppError('cancelled', DEFAULT_MESSAGES.cancelled, { cause: error });
  }

  if (isTimeoutError(error)) {
    return createAppError('timeout', DEFAULT_MESSAGES.timeout, { cause: error });
  }

  if (error instanceof Error) {
    const message = error.message.trim();
    return createAppError(
      fallbackKind,
      message.length > 0 ? message : DEFAULT_MESSAGES[fallbackKind],
      {
        cause: error,
      },
    );
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return createAppError(fallbackKind, error, { cause: error });
  }

  return createAppError(fallbackKind, DEFAULT_MESSAGES[fallbackKind], { cause: error });
}
