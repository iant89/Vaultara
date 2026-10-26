import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FavoriteButton, LikeButton } from './ToggleButton';

describe('FavoriteButton', () => {
  it('exposes its state through aria-pressed', () => {
    const { rerender } = render(
      <FavoriteButton active={false} itemTitle="A Film" onToggle={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Add A Film to favorites' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    rerender(<FavoriteButton active itemTitle="A Film" onToggle={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Remove A Film from favorites' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('requests the next state rather than toggling blindly', async () => {
    const onToggle = vi.fn();
    render(<FavoriteButton active itemTitle="A Film" onToggle={onToggle} />);

    await userEvent.click(screen.getByRole('button', { name: 'Remove A Film from favorites' }));

    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('has a usable name without an item title', () => {
    render(<FavoriteButton active={false} onToggle={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Add this item to favorites' })).toBeInTheDocument();
  });

  it('can be disabled while persistence is unavailable', async () => {
    const onToggle = vi.fn();
    render(<FavoriteButton active={false} itemTitle="A Film" disabled onToggle={onToggle} />);

    const button = screen.getByRole('button', { name: 'Add A Film to favorites' });
    expect(button).toBeDisabled();

    await userEvent.click(button);
    expect(onToggle).not.toHaveBeenCalled();
  });
});

describe('LikeButton', () => {
  it('uses like wording, not favourite wording', () => {
    render(<LikeButton active={false} itemTitle="A Film" onToggle={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Like A Film' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /favorite/i })).toBeNull();
  });

  it('reports unlike when already liked', async () => {
    const onToggle = vi.fn();
    render(<LikeButton active itemTitle="A Film" onToggle={onToggle} />);

    await userEvent.click(screen.getByRole('button', { name: 'Unlike A Film' }));

    expect(onToggle).toHaveBeenCalledWith(false);
  });
});
