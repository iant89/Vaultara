/**
 * A list that grows on request.
 *
 * Discovery lists are not all the same shape. A collection page's items, the collections nested
 * inside a collection, and an item's related content are all "the first batch, and more behind it"
 * — the reader decides whether the rest is worth fetching. This hook holds that pattern once:
 *
 *   - the first page arrives on mount (or when the key changes, e.g. a new sort order);
 *   - `loadMore()` requests exactly the next page and appends it;
 *   - duplicates are dropped by identity, because a provider whose index shifts between requests
 *     can return an item twice and nobody wants to see it twice;
 *   - a failure while loading more keeps the items already on screen and reports the failure
 *     beside the button, rather than replacing a readable list with an error page.
 *
 * The key is the identity of the whole list. Changing it (new collection, new sort, new filter)
 * starts again from page one and abandons any request still in flight for the old list.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { toAppError, type AppError } from '../models/errors';
import type { PaginatedResult } from '../models/pagination';
import type { AsyncState, LoadContext } from './useAsyncValue';

export type ProgressiveLoader<T> = (
  page: number,
  context: LoadContext,
) => Promise<PaginatedResult<T>>;

export interface ProgressiveListOptions<T> {
  /** Stable identity for an entry, so a repeated result is not rendered twice. */
  readonly getKey: (item: T) => string;
}

export type ProgressiveListStatus = 'loading' | 'error' | 'ready';

export interface ProgressiveList<T> {
  readonly items: readonly T[];
  readonly status: ProgressiveListStatus;
  /** Set when the first page failed; the list has nothing to show. */
  readonly error: AppError | undefined;
  readonly hasMore: boolean;
  /** Provider-reported total, when it gave one. Drives "Showing 24 of 4,210". */
  readonly total: number | undefined;
  readonly loadingMore: boolean;
  /** Set when appending failed; the items already loaded stay on screen. */
  readonly moreError: AppError | undefined;
  readonly loadMore: () => void;
  readonly reload: () => void;
}

interface ListState<T> {
  readonly key: string;
  readonly attempt: number;
  readonly status: ProgressiveListStatus;
  readonly items: readonly T[];
  readonly page: number;
  readonly hasMore: boolean;
  readonly total: number | undefined;
  readonly error: AppError | undefined;
  readonly loadingMore: boolean;
  readonly moreError: AppError | undefined;
}

function dedupe<T>(items: readonly T[], getKey: (item: T) => string): readonly T[] {
  const seen = new Set<string>();
  const unique: T[] = [];

  for (const item of items) {
    const key = getKey(item);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(item);
  }

  return unique;
}

const LOADING: Omit<ListState<never>, 'key' | 'attempt'> = {
  status: 'loading',
  items: [],
  page: 0,
  hasMore: false,
  total: undefined,
  error: undefined,
  loadingMore: false,
  moreError: undefined,
};

export function useProgressiveList<T>(
  key: string,
  load: ProgressiveLoader<T>,
  options: ProgressiveListOptions<T>,
): ProgressiveList<T> {
  const loadRef = useRef(load);
  const getKeyRef = useRef(options.getKey);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ListState<T>>({ key: '', attempt: 0, ...LOADING });

  const moreController = useRef<AbortController | undefined>(undefined);
  const loadingMoreRef = useRef(false);
  const attemptRef = useRef(0);
  const stateRef = useRef(state);

  useEffect(() => {
    loadRef.current = load;
    getKeyRef.current = options.getKey;
  });

  useEffect(() => {
    attemptRef.current = attempt;
  }, [attempt]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const controller = new AbortController();
    const fresh = attempt > 0;

    // A "load more" aimed at the previous list must not append to this one.
    moreController.current?.abort();
    moreController.current = undefined;
    loadingMoreRef.current = false;

    loadRef.current(1, { signal: controller.signal, fresh }).then(
      (result) => {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          key,
          attempt,
          status: 'ready',
          items: dedupe(result.items, getKeyRef.current),
          page: result.page,
          hasMore: result.hasMore,
          total: result.total ?? undefined,
          error: undefined,
          loadingMore: false,
          moreError: undefined,
        });
      },
      (error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        const appError = toAppError(error);

        // A cancellation is the caller's own doing and is not a failure to report.
        if (appError.kind === 'cancelled') {
          return;
        }

        setState({
          key,
          attempt,
          status: 'error',
          items: [],
          page: 0,
          hasMore: false,
          total: undefined,
          error: appError,
          loadingMore: false,
          moreError: undefined,
        });
      },
    );

    return () => {
      controller.abort();
    };
  }, [key, attempt]);

  useEffect(
    () => () => {
      moreController.current?.abort();
    },
    [],
  );

  const loadMore = useCallback(() => {
    const current = stateRef.current;

    if (
      loadingMoreRef.current ||
      current.key !== key ||
      current.status !== 'ready' ||
      !current.hasMore
    ) {
      return;
    }

    const controller = new AbortController();

    moreController.current?.abort();
    moreController.current = controller;
    loadingMoreRef.current = true;

    setState((previous) =>
      previous.key === key ? { ...previous, loadingMore: true, moreError: undefined } : previous,
    );

    loadRef
      .current(current.page + 1, { signal: controller.signal, fresh: attemptRef.current > 0 })
      .then(
        (result) => {
          if (controller.signal.aborted) {
            return;
          }

          loadingMoreRef.current = false;

          setState((previous) => {
            if (previous.key !== key) {
              return previous;
            }

            return {
              ...previous,
              status: 'ready',
              items: dedupe([...previous.items, ...result.items], getKeyRef.current),
              page: result.page,
              hasMore: result.hasMore,
              total: result.total ?? previous.total,
              loadingMore: false,
              moreError: undefined,
            };
          });
        },
        (error: unknown) => {
          if (controller.signal.aborted) {
            return;
          }

          loadingMoreRef.current = false;

          const appError = toAppError(error);

          setState((previous) => {
            if (previous.key !== key) {
              return previous;
            }

            return {
              ...previous,
              loadingMore: false,
              moreError: appError.kind === 'cancelled' ? undefined : appError,
            };
          });
        },
      );
  }, [key]);

  const reload = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  const settled = state.key === key && state.attempt === attempt ? state : undefined;

  return {
    items: settled?.items ?? LOADING.items,
    status: settled?.status ?? LOADING.status,
    error: settled?.error,
    hasMore: settled?.hasMore ?? false,
    total: settled?.total,
    loadingMore: settled?.loadingMore ?? false,
    moreError: settled?.moreError,
    loadMore,
    reload,
  };
}

/**
 * The first page as an `AsyncState`, so a growing list can be rendered through `AsyncContent`
 * without a second, near-identical loading/error branch in every page.
 *
 * Appending failures are not folded in here: they belong beside the list's own "View more"
 * control, because the entries already on screen are still worth reading.
 */
export function progressiveState<T>(list: ProgressiveList<T>): AsyncState<readonly T[]> {
  if (list.status === 'error' && list.error !== undefined) {
    return { status: 'error', error: list.error };
  }

  if (list.status === 'ready') {
    return { status: 'ready', value: list.items };
  }

  return { status: 'loading' };
}
