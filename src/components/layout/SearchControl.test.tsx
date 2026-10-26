import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { SearchControl } from './SearchControl';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

/**
 * jsdom does not evaluate media queries, so it effectively renders the *desktop* layout: the
 * mobile-only expand toggle computes as `display: none` and is excluded from role queries,
 * and being hidden it also cannot receive focus. The toggle's state machine is therefore
 * driven through the DOM node directly. Two things consequently need a real browser:
 * whether the control is visible at a given width, and whether focus returns to it on
 * Escape.
 */
function getExpandToggle(container: HTMLElement): HTMLButtonElement {
  const button = container.querySelector('form[role="search"] > button');
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error('Search expand toggle was not rendered.');
  }
  return button;
}

function renderSearch() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <SearchControl />
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SearchControl', () => {
  it('is a search landmark with a labelled input', () => {
    renderSearch();

    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search all providers' })).toBeInTheDocument();
  });

  it('navigates to the documented search route with the encoded query', async () => {
    renderSearch();

    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Search all providers' }),
      'silent film{Enter}',
    );

    expect(screen.getByTestId('location')).toHaveTextContent('/search?q=silent%20film');
  });

  it('navigates to bare search when submitted empty', async () => {
    renderSearch();

    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Search all providers' }),
      '{Enter}',
    );

    expect(screen.getByTestId('location')).toHaveTextContent('/search');
  });

  it('exposes an expand toggle for narrow viewports', () => {
    const { container } = renderSearch();
    const toggle = getExpandToggle(container);

    expect(toggle).toHaveAttribute('aria-label', 'Open search');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);

    const opened = getExpandToggle(container);
    expect(opened).toHaveAttribute('aria-label', 'Close search');
    expect(opened).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('searchbox', { name: 'Search all providers' })).toHaveFocus();
  });

  it('collapses again on Escape', () => {
    const { container } = renderSearch();

    fireEvent.click(getExpandToggle(container));
    expect(getExpandToggle(container)).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(screen.getByRole('searchbox', { name: 'Search all providers' }), {
      key: 'Escape',
    });

    expect(getExpandToggle(container)).toHaveAttribute('aria-expanded', 'false');
    expect(getExpandToggle(container)).toHaveAttribute('aria-label', 'Open search');
  });
});
