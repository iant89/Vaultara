import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { SessionProvider } from '../../data/SessionContext';
import { createTestPersistence } from '../../persistence/composition';
import { SettingsProvidersSection } from './SettingsSections';

describe('provider settings', () => {
  it('asks unsigned visitors to sign in rather than showing dead toggles', async () => {
    render(
      <MemoryRouter>
        <SessionProvider backend={createTestPersistence()}>
          <SettingsProvidersSection />
        </SessionProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Sign in to save which providers appear/)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('persists a disabled provider', async () => {
    const user = userEvent.setup();
    const backend = createTestPersistence();
    const session = await backend.createAccount({
      email: 'alex@example.com',
      password: 'correct horse',
      displayName: 'Alex',
    });

    render(
      <MemoryRouter>
        <SessionProvider backend={backend}>
          <SettingsProvidersSection />
        </SessionProvider>
      </MemoryRouter>,
    );

    const wikipedia = await screen.findByRole('checkbox', { name: /Wikipedia/ });
    expect(wikipedia).toBeChecked();

    await user.click(wikipedia);

    await waitFor(() => {
      expect(wikipedia).not.toBeChecked();
    });
    expect((await backend.getPreferences(session.sessionId)).disabledProviderIds).toEqual([
      'wikipedia',
    ]);
  });
});
