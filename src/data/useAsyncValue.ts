/**
 * Async state for one request, keyed by its arguments.
 *
 * The key is the identity of the request: when it changes (page two, another collection), the
 * previous call is aborted and a new one starts. A component that unmounts aborts too, so a fast
 * click through several collections does not leave requests running behind it.
 *
 * `reload` re-requests rather than re-reading the cache, otherwise a "Try again" button after a
 * failure would replay the cached failure — or, worse, appear to do nothing at all.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { toAppError, type AppError } from '../models/errors';

export type AsyncState<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly error: AppError }
  | { readonly status: 'ready'; readonly value: T };

export interface AsyncResult<T> {
  readonly state: AsyncState<T>;
  readonly reload: () => void;
}

export interface LoadContext {
  readonly signal: AbortSignal;
  /** True after the caller asked to reload: bypass the cache. */
  readonly fresh: boolean;
}

export type AsyncLoader<T> = (context: LoadContext) => Promise<T>;

const LOADING: AsyncState<never> = { status: 'loading' };

export function useAsyncValue<T>(key: string, load: AsyncLoader<T>): AsyncResult<T> {
  const loadRef = useRef(load);
  const [attempt, setAttempt] = useState(0);
  // The key the settled result belongs to. Comparing it with the current request is what makes a
  // changed key read as loading immediately, without setting state from inside an effect — a
  // pattern that would render twice for every navigation.
  const [entry, setEntry] = useState<{ readonly key: string; readonly state: AsyncState<T> }>({
    key: '',
    state: LOADING,
  });
  const requestKey = `${String(attempt)}:${key}`;

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    const controller = new AbortController();
    const fresh = attempt > 0;

    loadRef.current({ signal: controller.signal, fresh }).then(
      (value) => {
        if (!controller.signal.aborted) {
          setEntry({ key: requestKey, state: { status: 'ready', value } });
        }
      },
      (error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        const appError = toAppError(error);

        // A cancellation that arrives late is not a failure to report.
        if (appError.kind !== 'cancelled') {
          setEntry({ key: requestKey, state: { status: 'error', error: appError } });
        }
      },
    );

    return () => {
      controller.abort();
    };
  }, [requestKey, attempt]);

  const reload = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  return { state: entry.key === requestKey ? entry.state : LOADING, reload };
}
