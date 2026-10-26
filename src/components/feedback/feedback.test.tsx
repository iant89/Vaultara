import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createAppError } from '../../models/errors';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { LoadingState } from './LoadingState';
import { NotYetImplemented } from './NotYetImplemented';

describe('LoadingState', () => {
  it('announces itself as a live status region', () => {
    render(<LoadingState label="Loading favorites" />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading favorites');
  });

  it('hides the decorative spinner from assistive technology', () => {
    const { container } = render(<LoadingState />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});

describe('EmptyState', () => {
  it('renders a title and optional description', () => {
    render(<EmptyState title="Nothing here" description="Try another filter." />);

    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.getByText('Try another filter.')).toBeInTheDocument();
  });
});

describe('ErrorState', () => {
  it('exposes the failure as an alert with an explanatory message', () => {
    render(<ErrorState error={createAppError('rate-limited', '')} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Something went wrong');
    expect(alert).toHaveTextContent(/too many requests/i);
  });

  it('lets the caller retry', async () => {
    const onRetry = vi.fn();
    render(<ErrorState error={new Error('Boom')} onRetry={onRetry} retryLabel="Retry now" />);

    await userEvent.click(screen.getByRole('button', { name: 'Retry now' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('offers no retry control when retrying is not possible', () => {
    render(<ErrorState error={new Error('Boom')} />);

    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('NotYetImplemented', () => {
  it('states the status in text rather than relying on styling', () => {
    render(
      <NotYetImplemented
        feature="Global search"
        summary="Search arrives later."
        plannedPhase="Phase 9"
      />,
    );

    expect(screen.getByText('Not implemented')).toBeInTheDocument();
    expect(screen.getByText('Global search is not available yet')).toBeInTheDocument();
    expect(screen.getByText('Search arrives later.')).toBeInTheDocument();
    expect(screen.getByText(/Phase 9/)).toBeInTheDocument();
  });
});
