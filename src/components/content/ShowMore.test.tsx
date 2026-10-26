import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createAppError } from '../../models/errors';
import { ShowMore } from './ShowMore';

const baseProps = {
  shown: 24,
  total: 4210,
  noun: 'items',
  scope: 'items',
  hasMore: true,
  loading: false,
  onLoadMore: () => {},
};

describe('ShowMore', () => {
  it('renders nothing once the list is complete', () => {
    render(<ShowMore {...baseProps} hasMore={false} total={24} />);

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText(/showing/i)).toBeNull();
  });

  it('reports how much is on screen and offers the next batch', async () => {
    const onLoadMore = vi.fn();

    render(<ShowMore {...baseProps} onLoadMore={onLoadMore} />);

    expect(screen.getByText('Showing 24 of 4,210 items')).toBeInTheDocument();

    const button = screen.getByRole('button', { name: 'View more items' });

    // The visible label is what the request asked for; the scope tells several such buttons apart.
    expect(button).toHaveTextContent('View more');

    await userEvent.click(button);

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('keeps the button in place and busy while the batch loads', () => {
    render(<ShowMore {...baseProps} loading />);

    expect(screen.getByRole('button', { name: 'View more items' })).toBeDisabled();
    expect(screen.getByText('· Loading more…')).toBeInTheDocument();
  });

  it('says only what it knows when the provider gave no total', () => {
    render(<ShowMore {...baseProps} total={undefined} />);

    expect(screen.getByText('Showing 24 items')).toBeInTheDocument();
  });

  it('replaces the control with a retry when appending failed', async () => {
    const onLoadMore = vi.fn();

    render(
      <ShowMore
        {...baseProps}
        error={createAppError('network', 'The network request failed.')}
        onLoadMore={onLoadMore}
      />,
    );

    expect(screen.getByText('Could not load more')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View more items' })).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});
