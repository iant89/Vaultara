import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Navigation } from './Navigation';

function renderNavigation() {
  return render(
    <MemoryRouter>
      <Navigation />
    </MemoryRouter>,
  );
}

describe('Navigation', () => {
  it('links the brand to discovery and hides the decorative mark from assistive tech', () => {
    renderNavigation();

    const brand = screen.getByRole('link', { name: 'Vaultara' });
    expect(brand).toHaveAttribute('href', '/');
    expect(brand.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('exposes a providers landmark with the configured providers', () => {
    renderNavigation();

    const providers = screen.getByRole('navigation', { name: 'Providers' });
    expect(within(providers).getByRole('link', { name: /Internet Archive/ })).toHaveAttribute(
      'href',
      '/provider/archive',
    );
    expect(within(providers).getByRole('link', { name: /Wikipedia/ })).toHaveAttribute(
      'href',
      '/provider/wikipedia',
    );
  });

  it('marks planned providers as not yet available in their accessible name', () => {
    renderNavigation();

    expect(
      screen.getByRole('link', { name: 'Internet Archive (not yet available)' }),
    ).toBeInTheDocument();
  });

  it('hides the Adult provider while it is disabled', () => {
    renderNavigation();

    expect(screen.queryByRole('link', { name: /^Adult/ })).toBeNull();
  });

  // Design spec 4.3: favourites must remain directly accessible at every width, so it is a
  // top-level control rather than something buried in the account menu.
  it('keeps favourites directly reachable', () => {
    renderNavigation();

    expect(screen.getByRole('link', { name: 'Favorites' })).toHaveAttribute('href', '/favorites');
  });

  it('provides the global search control', () => {
    renderNavigation();

    expect(screen.getByRole('searchbox', { name: 'Search all providers' })).toBeInTheDocument();
  });

  it('groups library destinations inside the account menu', async () => {
    renderNavigation();

    await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));

    const library = screen.getByRole('group', { name: 'Your library' });
    for (const [label, href] of [
      ['Search', '/search'],
      ['History', '/history'],
      ['Downloads', '/downloads'],
    ] as const) {
      expect(within(library).getByRole('link', { name: label })).toHaveAttribute('href', href);
    }
  });

  it('states the account status honestly instead of implying a signed-in user', async () => {
    renderNavigation();

    await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));

    expect(screen.getByText(/Not signed in/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /sign out/i })).toBeNull();
  });

  it('offers the settings subsections', async () => {
    renderNavigation();

    await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));

    const settings = screen.getByRole('group', { name: 'Settings' });
    expect(within(settings).getByRole('link', { name: 'Content visibility' })).toHaveAttribute(
      'href',
      '/settings/content',
    );
  });
});
