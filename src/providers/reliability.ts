/**
 * Request policy shared by every provider call (design specification 25, 28).
 *
 * Without this, each adapter would invent its own timeout, retry, and cancellation behaviour,
 * and a single slow provider would stall whatever awaited it. One policy here means:
 *
 * - **Timeouts** are enforced by racing the operation, not by trusting the adapter to honour
 *   the signal. An adapter that ignores its `AbortSignal` still cannot hang a caller.
 * - **Cancellation** is final. An abort is reported as `cancelled`, never retried, and never
 *   recorded as a provider failure — the user asked for it.
 * - **Retries** apply only to transient kinds (timeout, network, rate limit, unavailability)
 *   with exponential backoff and jitter, so a struggling provider is not hammered in lockstep
 *   with every other client.
 * - **Rate limits** are obeyed: when a provider states how long to wait, that wins over the
 *   computed backoff, within the configured cap.
 */

import {
  attachProviderId,
  createAppError,
  getDefaultErrorMessage,
  toAppError,
  type AppError,
  type AppErrorKind,
} from '../models/errors';

export interface RetryPolicy {
  /** Total attempts including the first. `1` disables retrying. */
  readonly maxAttempts: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  /** Random variation applied to each delay, as a fraction of the computed delay. */
  readonly jitterRatio: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = Object.freeze({
  maxAttempts: 3,
  baseDelayMs: 200,
  maxDelayMs: 5_000,
  jitterRatio: 0.2,
});

/** Generous enough for a slow archive API, short enough that a hang is still felt as an error. */
export const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

/**
 * Kinds worth another attempt. An invalid response is excluded deliberately: retrying a
 * malformed payload just fetches the same malformed payload again.
 */
const RETRYABLE_KINDS: ReadonlySet<AppErrorKind> = new Set<AppErrorKind>([
  'timeout',
  'network',
  'rate-limited',
  'provider-unavailable',
]);

export function isRetryable(error: AppError): boolean {
  return RETRYABLE_KINDS.has(error.kind);
}

/**
 * Exponential backoff with jitter, capped. A provider-supplied `retryAfterMs` takes precedence
 * because it is the only party that knows when its limit lifts.
 */
export function computeBackoffDelay(
  attempt: number,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
  random: () => number = Math.random,
  retryAfterMs?: number,
): number {
  if (retryAfterMs !== undefined && Number.isFinite(retryAfterMs)) {
    return Math.min(policy.maxDelayMs, Math.max(0, retryAfterMs));
  }

  const step = Math.max(1, Math.trunc(attempt));
  const base = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** (step - 1));
  const jitter = base * policy.jitterRatio * (random() * 2 - 1);

  return Math.max(0, Math.min(policy.maxDelayMs, Math.round(base + jitter)));
}

/** Read through a helper so narrowing from an earlier check cannot make later checks dead code. */
function isAborted(signal?: AbortSignal): boolean {
  return signal !== undefined && signal.aborted;
}

function cancelledError(providerId?: string): AppError {
  return createAppError('cancelled', getDefaultErrorMessage('cancelled'), {
    ...(providerId !== undefined ? { providerId } : {}),
  });
}

/** Resolve after `ms`, rejecting immediately if the signal aborts first. */
export function sleepWithSignal(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) {
    return isAborted(signal) ? Promise.reject(cancelledError()) : Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    if (isAborted(signal)) {
      reject(cancelledError());
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    function onAbort(): void {
      clearTimeout(timer);
      reject(cancelledError());
    }

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export interface ExecutionContext {
  /** 1-based attempt number; adapters may log it but should not branch on it. */
  readonly attempt: number;
  readonly signal: AbortSignal;
}

export interface ExecutionOptions {
  readonly providerId?: string;
  /** Caller cancellation. Aborting this is treated as a cancellation, never a failure. */
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  readonly retry?: RetryPolicy;
  /** Injectable for tests; defaults to a real signal-aware sleep. */
  readonly sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  /** Injectable for tests; defaults to `Math.random`. */
  readonly random?: () => number;
}

function toProviderError(error: unknown, providerId?: string): AppError {
  const normalized = toAppError(error);

  return providerId !== undefined ? attachProviderId(normalized, providerId) : normalized;
}

/** Link an outer signal to an attempt controller so an abort propagates inward. */
function forwardAbort(source: AbortSignal | undefined, target: AbortController): () => void {
  if (source === undefined) {
    return () => undefined;
  }

  if (source.aborted) {
    target.abort();
    return () => undefined;
  }

  const onAbort = (): void => target.abort();
  source.addEventListener('abort', onAbort, { once: true });

  return () => source.removeEventListener('abort', onAbort);
}

/**
 * Reject as soon as the signal aborts, regardless of whether the operation respects it. The
 * abandoned promise still settles on its own; racing keeps it from becoming unhandled.
 */
function raceWithAbort<T>(
  operation: Promise<T>,
  signal: AbortSignal,
  providerId?: string,
): Promise<T> {
  if (signal.aborted) {
    // The operation may already be in flight; keep its eventual rejection from surfacing as an
    // unhandled rejection when the caller has already been told the request was cancelled.
    operation.catch(() => undefined);

    return Promise.reject(cancelledError(providerId));
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => reject(cancelledError(providerId));

    signal.addEventListener('abort', onAbort, { once: true });
    operation.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error instanceof Error ? error : toProviderError(error, providerId));
      },
    );
  });
}

/**
 * Run one provider operation under the shared policy.
 *
 * The operation receives a signal that fires on either the timeout or caller cancellation, so
 * adapters that forward it release their network request rather than letting it run on.
 */
export async function executeWithPolicy<T>(
  operation: (context: ExecutionContext) => Promise<T>,
  options: ExecutionOptions = {},
): Promise<T> {
  const { providerId, signal } = options;
  const retry = options.retry ?? DEFAULT_RETRY_POLICY;
  const maxAttempts = Math.max(1, Math.trunc(retry.maxAttempts));
  const timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const sleep = options.sleep ?? sleepWithSignal;
  const random = options.random ?? Math.random;

  if (isAborted(signal)) {
    throw cancelledError(providerId);
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const detach = forwardAbort(signal, controller);
    let timedOut = false;
    const timer =
      timeoutMs > 0
        ? setTimeout(() => {
            timedOut = true;
            controller.abort();
          }, timeoutMs)
        : undefined;

    try {
      // Never start an attempt that is already doomed: invoking the adapter after the caller
      // cancelled wastes a request, and its later rejection would go unhandled.
      if (isAborted(controller.signal)) {
        throw cancelledError(providerId);
      }

      return await raceWithAbort(
        operation({ attempt, signal: controller.signal }),
        controller.signal,
        providerId,
      );
    } catch (error) {
      // A caller abort wins over everything: it is not a provider failure and must not retry.
      if (isAborted(signal)) {
        throw cancelledError(providerId);
      }

      const normalized = timedOut
        ? createAppError('timeout', getDefaultErrorMessage('timeout'), {
            ...(providerId !== undefined ? { providerId } : {}),
            cause: error,
          })
        : toProviderError(error, providerId);

      const isLastAttempt = attempt >= maxAttempts;

      if (isLastAttempt || !isRetryable(normalized)) {
        throw normalized;
      }

      await sleep(computeBackoffDelay(attempt, retry, random, normalized.retryAfterMs), signal);
    } finally {
      if (timer !== undefined) {
        clearTimeout(timer);
      }

      detach();
    }
  }

  // Unreachable: the loop either returns or throws on its final iteration.
  throw createAppError('unknown', getDefaultErrorMessage('unknown'), {
    ...(providerId !== undefined ? { providerId } : {}),
  });
}
