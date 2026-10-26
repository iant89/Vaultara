import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createAppError } from '../models/errors';
import { createPaginatedResult } from '../models/pagination';
import { useProgressiveList, type ProgressiveList } from './useProgressiveList';

interface Entry {
  readonly id: string;
}

function page(ids: readonly string[], options: { page: number; pageSize: number; total: number }) {
  return createPaginatedResult(
    ids.map((id) => ({ id })),
    options,
  );
}

/** Renders the hook's state as text so assertions stay about behaviour, not markup. */
function Harness({
  listKey,
  load,
  onList,
}: {
  readonly listKey: string;
  readonly load: Parameters<typeof useProgressiveList<Entry>>[1];
  readonly onList: (list: ProgressiveList<Entry>) => void;
}) {
  const list = useProgressiveList(listKey, load, { getKey: (entry) => entry.id });

  onList(list);

  return (
    <div>
      <p data-testid="status">{list.status}</p>
      <p data-testid="ids">{list.items.map((entry) => entry.id).join(',')}</p>
      <p data-testid="total">{list.total ?? 'unknown'}</p>
      <p data-testid="more">{list.loadingMore ? 'loading' : 'idle'}</p>
      <p data-testid="error">{list.error?.kind ?? 'none'}</p>
      <p data-testid="more-error">{list.moreError?.kind ?? 'none'}</p>
      <button type="button" onClick={list.loadMore}>
        more
      </button>
      <button type="button" onClick={list.reload}>
        reload
      </button>
    </div>
  );
}

describe('useProgressiveList', () => {
  it('loads the first page and reports what the provider said', async () => {
    const load = vi.fn(async (_requested: number) =>
      page(['a', 'b'], { page: 1, pageSize: 2, total: 5 }),
    );

    render(<Harness listKey="k" load={load} onList={() => {}} />);

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(screen.getByTestId('ids')).toHaveTextContent('a,b');
    expect(screen.getByTestId('total')).toHaveTextContent('5');
    expect(load).toHaveBeenCalledTimes(1);
    expect(load.mock.calls[0]?.[0]).toBe(1);
  });

  it('appends the next page instead of replacing the list', async () => {
    const load = vi.fn(async (requested: number) =>
      page(requested === 1 ? ['a', 'b'] : ['c'], {
        page: requested,
        pageSize: 2,
        total: 5,
      }),
    );

    render(<Harness listKey="k" load={load} onList={() => {}} />);

    await waitFor(() => expect(screen.getByTestId('ids')).toHaveTextContent('a,b'));

    await userEvent.click(screen.getByRole('button', { name: 'more' }));

    await waitFor(() => expect(screen.getByTestId('ids')).toHaveTextContent('a,b,c'));
    expect(load.mock.calls.map((call) => call[0])).toEqual([1, 2]);
    expect(screen.getByTestId('more')).toHaveTextContent('idle');
  });

  it('drops an entry a shifting index returns twice', async () => {
    const load = vi.fn(async (requested: number) =>
      page(requested === 1 ? ['a', 'b'] : ['b', 'c'], {
        page: requested,
        pageSize: 2,
        total: 6,
      }),
    );

    render(<Harness listKey="k" load={load} onList={() => {}} />);

    await waitFor(() => expect(screen.getByTestId('ids')).toHaveTextContent('a,b'));
    await userEvent.click(screen.getByRole('button', { name: 'more' }));

    await waitFor(() => expect(screen.getByTestId('ids')).toHaveTextContent('a,b,c'));
  });

  it('keeps the loaded entries when appending fails, and reports the failure', async () => {
    const load = vi.fn(async (requested: number) => {
      if (requested > 1) {
        throw createAppError('network', 'The network request failed.');
      }

      return page(['a'], { page: 1, pageSize: 1, total: 3 });
    });

    render(<Harness listKey="k" load={load} onList={() => {}} />);

    await waitFor(() => expect(screen.getByTestId('ids')).toHaveTextContent('a'));
    await userEvent.click(screen.getByRole('button', { name: 'more' }));

    await waitFor(() => expect(screen.getByTestId('more-error')).toHaveTextContent('network'));
    expect(screen.getByTestId('ids')).toHaveTextContent('a');
    expect(screen.getByTestId('status')).toHaveTextContent('ready');
  });

  it('starts again from page one when the key changes', async () => {
    const load = vi.fn(async (requested: number) =>
      page([`${String(requested)}`], { page: requested, pageSize: 1, total: 1 }),
    );

    const { rerender } = render(<Harness listKey="first" load={load} onList={() => {}} />);

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));

    rerender(<Harness listKey="second" load={load} onList={() => {}} />);

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(load.mock.calls.map((call) => call[0])).toEqual([1, 1]);
  });

  it('reloads through the cache bypass rather than replaying the failure', async () => {
    let attempt = 0;
    const load = vi.fn(async (_requested: number, context: { fresh: boolean }) => {
      attempt += 1;

      if (attempt === 1) {
        throw createAppError('network', 'The network request failed.');
      }

      return page([context.fresh ? 'fresh' : 'cached'], {
        page: 1,
        pageSize: 1,
        total: 1,
      });
    });

    render(<Harness listKey="k" load={load} onList={() => {}} />);

    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('network'));

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'reload' }));
    });

    await waitFor(() => expect(screen.getByTestId('ids')).toHaveTextContent('fresh'));
    expect(screen.getByTestId('error')).toHaveTextContent('none');
  });
});
