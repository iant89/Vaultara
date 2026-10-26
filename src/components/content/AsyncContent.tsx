import type { ReactElement, ReactNode } from 'react';
import type { AsyncState } from '../../data/useAsyncValue';
import { EmptyState } from '../feedback/EmptyState';
import { ErrorState } from '../feedback/ErrorState';
import { LoadingState } from '../feedback/LoadingState';

interface AsyncContentProps<T> {
  readonly state: AsyncState<T>;
  readonly reload: () => void;
  /** Replaces the default loading indicator with placeholders shaped like the content. */
  readonly loading?: ReactNode;
  readonly errorTitle?: string;
  /**
   * Shown instead of a retry panel when the request failed because the content does not exist.
   * Retrying a missing item only wastes a request and tells the reader nothing new.
   */
  readonly missing?: { readonly title: string; readonly description?: string };
  readonly children: (value: T) => ReactNode;
}

/**
 * Renders one async value: loading, failure with a retry, missing content, or the value.
 *
 * Every content surface in the discovery experience goes through this, so a failed request always
 * looks and behaves the same way and never leaves a blank area with no explanation
 * (design spec 28).
 */
export function AsyncContent<T>({
  state,
  reload,
  loading,
  errorTitle,
  missing,
  children,
}: AsyncContentProps<T>): ReactElement {
  if (state.status === 'loading') {
    return <>{loading ?? <LoadingState />}</>;
  }

  if (state.status === 'error') {
    if (missing !== undefined && state.error.kind === 'not-found') {
      return (
        <EmptyState
          title={missing.title}
          {...(missing.description !== undefined ? { description: missing.description } : {})}
        />
      );
    }

    return (
      <ErrorState
        error={state.error}
        {...(errorTitle !== undefined ? { title: errorTitle } : {})}
        onRetry={reload}
      />
    );
  }

  return <>{children(state.value)}</>;
}
