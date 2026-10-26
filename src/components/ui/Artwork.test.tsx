import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Artwork } from './Artwork';

describe('Artwork', () => {
  it('renders the image with lazy loading by default', () => {
    render(<Artwork src="/thumb.jpg" alt="" fallbackLabel="Book" />);

    const image = screen.getByRole('presentation', { hidden: true });
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('decoding', 'async');
  });

  it('loads eagerly when marked as priority', () => {
    render(<Artwork src="/hero.jpg" alt="" fallbackLabel="Film" priority />);

    const image = document.querySelector('img');
    expect(image).toHaveAttribute('loading', 'eager');
  });

  it('shows the labelled fallback when there is no artwork', () => {
    render(<Artwork alt="" fallbackLabel="Document" />);

    expect(screen.getByTestId('artwork-fallback')).toHaveTextContent('Document');
    expect(document.querySelector('img')).toBeNull();
  });

  // Regression guard: a broken provider thumbnail must not leave a broken-image icon or
  // collapse the card's layout (design spec 5.3).
  it('falls back when the image fails to load', () => {
    render(<Artwork src="/missing.jpg" alt="" fallbackLabel="Audio" />);

    fireEvent.error(document.querySelector('img') as HTMLImageElement);

    expect(screen.getByTestId('artwork-fallback')).toHaveTextContent('Audio');
    expect(document.querySelector('img')).toBeNull();
  });

  it('treats an empty src as missing artwork', () => {
    render(<Artwork src="" alt="" fallbackLabel="Image" />);

    expect(screen.getByTestId('artwork-fallback')).toBeInTheDocument();
  });
});
