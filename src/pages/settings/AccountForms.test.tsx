import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { SessionProvider } from '../../data/SessionContext';
import { createTestPersistence } from '../../persistence/composition';
import { createMemoryKvStore } from '../../persistence/memoryKv';
import { SettingsOverviewSection } from './SettingsSections';

function renderOverview(backend = createTestPersistence()) {
  return render(
    <MemoryRouter>
      <SessionProvider backend={backend}>
        <SettingsOverviewSection />
      </SessionProvider>
    </MemoryRouter>,
  );
}

function required<T>(value: T | undefined, label: string): T {
  if (value === undefined) {
    throw new Error(`missing ${label}`);
  }

  return value;
}

describe('account settings', () => {
  it('creates an account and then offers sign out', async () => {
    const user = userEvent.setup();
    renderOverview();

    expect(await screen.findByRole('heading', { name: 'Create account' })).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Display name' }), 'Alex');
    await user.type(
      required(screen.getAllByRole('textbox', { name: 'Email' })[0], 'create email'),
      'alex@example.com',
    );
    await user.type(
      required(screen.getAllByLabelText('Password')[0], 'create password'),
      'correct horse',
    );
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText(/Signed in as/)).toHaveTextContent('Alex');
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Create account' })).toBeNull();
  });

  it('restores the account from the same store', async () => {
    const kv = createMemoryKvStore();
    const first = createTestPersistence({ kv });
    await first.createAccount({
      email: 'alex@example.com',
      password: 'correct horse',
      displayName: 'Alex',
    });

    renderOverview(createTestPersistence({ kv }));

    expect(await screen.findByText(/Signed in as/)).toHaveTextContent('Alex');
  });

  it('explains a failed sign-in instead of inventing a session', async () => {
    const user = userEvent.setup();
    const backend = createTestPersistence();
    await backend.createAccount({
      email: 'alex@example.com',
      password: 'correct horse',
      displayName: 'Alex',
    });
    await backend.signOut((await backend.restoreCurrentSession())?.sessionId ?? '');

    renderOverview(backend);

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    await user.type(
      required(screen.getAllByRole('textbox', { name: 'Email' })[1], 'sign-in email'),
      'alex@example.com',
    );
    await user.type(
      required(screen.getAllByLabelText('Password')[1], 'sign-in password'),
      'nope nope',
    );
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/email or password/i);
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });
});
