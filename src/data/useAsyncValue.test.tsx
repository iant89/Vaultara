import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useAsyncValue, type AsyncLoader } from './useAsyncValue';

function Probe({
  requestKey,
  load,
}: {
  readonly requestKey: string;
  readonly load: AsyncLoader<string>;
}) {
  const { state, reload } = useAsyncValue(requestKey, load);

  return (
    <div>
      <span data-testid="status">{state.status}</span>
      {state.status === 'ready' ? <span data-testid="value">{state.value}</span> : null}
      {state.status === 'error' ? <span data-testid="error">{state.error.kind}</span> : null}
      <button
        type="button"
        onClick={() => {
          reload();
        }}
      >
        Try again
      </button>
    </div>
  );
}

describe('useAsyncValue', () => {
  it('reports loading, then the value', async () => {
    render(<Probe requestKey="a" load={() => Promise.resolve('first')} />);

    expect(screen.getByTestId('status')).toHaveTextContent('loading');
    await waitFor(() => {
      expect(screen.getByTestId('value')).toHaveTextContent('first');
    });
  });

  it('reports a failure as an AppError and recovers on retry', async () => {
    const load = vi
      .fn<AsyncLoader<string>>()
      .mockRejectedValueOnce(new Error('provider down'))
      .mockResolvedValueOnce('recovered');

    render(<Probe requestKey="a" load={load} />);

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('unknown');
    });

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => {
      expect(screen.getByTestId('value')).toHaveTextContent('recovered');
    });
  });

  it('asks the loader for fresh data when reloading', async () => {
    const freshFlags: boolean[] = [];
    const load: AsyncLoader<string> = (context) => {
      freshFlags.push(context.fresh);

      return Promise.resolve('value');
    };

    render(<Probe requestKey="a" load={load} />);

    await waitFor(() => {
      expect(screen.getByTestId('value')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => {
      expect(freshFlags).toEqual([false, true]);
    });
  });

  it('aborts the previous request when the key changes', async () => {
    const signals: AbortSignal[] = [];
    const load: AsyncLoader<string> = (context) => {
      signals.push(context.signal);

      return new Promise(() => {
        // Never settles: the point is that the first request is abandoned.
      });
    };

    const { rerender } = render(<Probe requestKey="a" load={load} />);
    rerender(<Probe requestKey="b" load={load} />);

    await waitFor(() => {
      expect(signals).toHaveLength(2);
    });
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);
  });

  it('does not surface a cancellation as an error', async () => {
    render(
      <Probe
        requestKey="a"
        load={() =>
          Promise.reject(
            Object.assign(new Error('cancelled'), { kind: 'cancelled', message: 'cancelled' }),
          )
        }
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('loading');
    });
    expect(screen.queryByTestId('error')).toBeNull();
  });
});
