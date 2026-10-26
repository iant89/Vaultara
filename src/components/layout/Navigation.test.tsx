import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from '../../models/account';
import { SessionProvider } from '../../data/SessionContext';
import { createTestPersistence } from '../../persistence/composition';
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

  it('does not mark providers that have an adapter as unavailable', () => {
    renderNavigation();

    expect(screen.getByRole('link', { name: 'Wikipedia' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Wikipedia (not yet available)' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Internet Archive' })).not.toHaveAccessibleName(
      /not yet available/,
    );
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
    expect(screen.queryByRole('button', { name: 'Sign out' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Create account or sign in' })).toHaveAttribute(
      'href',
      '/settings',
    );
  });

  it('names the signed-in account and offers a working sign out', async () => {
    const backend = createTestPersistence();
    await backend.createAccount({
      email: 'alex@example.com',
      password: 'correct horse',
      displayName: 'Alex',
    });

    render(
      <MemoryRouter>
        <SessionProvider backend={backend}>
          <Navigation />
        </SessionProvider>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));

    expect(await screen.findByText(/Signed in as Alex/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('hides a provider the signed-in account disabled', async () => {
    const backend = createTestPersistence();
    const session = await backend.createAccount({
      email: 'alex@example.com',
      password: 'correct horse',
      displayName: 'Alex',
    });
    await backend.setPreferences(session.sessionId, {
      ...DEFAULT_PREFERENCES,
      disabledProviderIds: ['wikipedia'],
    });

    render(
      <MemoryRouter>
        <SessionProvider backend={backend}>
          <Navigation />
        </SessionProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('link', { name: 'Internet Archive' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('link', { name: 'Wikipedia' })).toBeNull();
    });
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
