import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestPersistence } from '../../persistence/composition';

async function loadHarness(adultEnabled: boolean) {
  vi.resetModules();
  vi.doMock('../../config/env', () => ({
    appEnvironment: {
      mode: 'test',
      apiBaseUrl: null,
      adultProviderEnabled: adultEnabled,
    },
  }));

  const [{ ContentVisibility }, { SessionProvider }] = await Promise.all([
    import('./ContentVisibility'),
    import('../../data/SessionContext'),
  ]);

  return { ContentVisibility, SessionProvider };
}

afterEach(() => {
  vi.doUnmock('../../config/env');
  vi.resetModules();
});

describe('content visibility settings', () => {
  it('says Adult cannot be enabled when the deploy flag is off', async () => {
    const { ContentVisibility, SessionProvider } = await loadHarness(false);

    render(
      <MemoryRouter>
        <SessionProvider backend={createTestPersistence()}>
          <ContentVisibility />
        </SessionProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText(/disabled for this deployment/)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('requires sign-in before age confirmation when the deploy flag is on', async () => {
    const { ContentVisibility, SessionProvider } = await loadHarness(true);

    render(
      <MemoryRouter>
        <SessionProvider backend={createTestPersistence()}>
          <ContentVisibility />
        </SessionProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Sign in to confirm you are of legal age/)).toBeInTheDocument();
  });

  it('persists age confirmation, opt-in, and shared-list hiding', async () => {
    const user = userEvent.setup();
    const { ContentVisibility, SessionProvider } = await loadHarness(true);
    const backend = createTestPersistence();
    const session = await backend.createAccount({
      email: 'alex@example.com',
      password: 'correct horse',
      displayName: 'Alex',
    });

    render(
      <MemoryRouter>
        <SessionProvider backend={backend}>
          <ContentVisibility />
        </SessionProvider>
      </MemoryRouter>,
    );

    const age = await screen.findByRole('checkbox', { name: /of legal age/ });
    const optIn = screen.getByRole('checkbox', { name: /Enable the Adult provider/ });
    const hide = screen.getByRole('checkbox', { name: /Hide Adult items/ });

    expect(optIn).toBeDisabled();
    expect(hide).toBeChecked();

    await user.click(age);
    await waitFor(() => {
      expect(optIn).toBeEnabled();
    });

    await user.click(optIn);
    await user.click(hide);

    await waitFor(async () => {
      const preferences = await backend.getPreferences(session.sessionId);
      expect(preferences.adultAgeConfirmed).toBe(true);
      expect(preferences.adultOptIn).toBe(true);
      expect(preferences.hideAdultInSharedLists).toBe(false);
    });
  });
});
