/**
 * Download history (roadmap Phase 10, design spec 16).
 */

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { SessionProvider } from '../data/SessionContext';
import { DEFAULT_PREFERENCES } from '../models/account';
import { createTestPersistence } from '../persistence/composition';
import { DownloadsPage } from './DownloadsPage';

const PASSWORD = 'correct horse';

async function signedInBackend() {
  const backend = createTestPersistence();
  const session = await backend.createAccount({
    email: 'alex@example.com',
    password: PASSWORD,
    displayName: 'Alex',
  });
  await backend.setPreferences(session.sessionId, {
    ...DEFAULT_PREFERENCES,
    onboardingCompleted: true,
  });
  return { backend, session };
}

function renderPage(backend: ReturnType<typeof createTestPersistence>) {
  render(
    <SessionProvider backend={backend}>
      <MemoryRouter>
        <DownloadsPage />
      </MemoryRouter>
    </SessionProvider>,
  );
}

describe('downloads page', () => {
  it('asks unsigned visitors to sign in', async () => {
    renderPage(createTestPersistence());

    expect(await screen.findByText('Sign in to keep download history')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Settings' })).toHaveAttribute(
      'href',
      '/settings',
    );
  });

  it('starts empty for a signed-in account', async () => {
    const { backend } = await signedInBackend();
    renderPage(backend);

    expect(await screen.findByText('Nothing opened yet')).toBeInTheDocument();
  });

  it('lists an opened attempt without claiming the file arrived', async () => {
    const { backend, session } = await signedInBackend();
    await backend.putDownload(session.sessionId, {
      id: 'dl-1',
      providerId: 'archive',
      itemId: 'night_of_the_living_dead',
      itemTitle: 'Night of the Living Dead',
      fileId: 'night.mp4',
      fileName: 'night.mp4',
      mimeType: 'video/mp4',
      downloadUrl: 'https://archive.org/download/night_of_the_living_dead/night.mp4',
      startedAt: '2026-10-26T12:00:00.000Z',
      status: 'opened',
    });

    renderPage(backend);

    expect(await screen.findByRole('link', { name: 'Night of the Living Dead' })).toHaveAttribute(
      'href',
      '/item/archive/night_of_the_living_dead',
    );
    expect(screen.getByText(/cannot confirm the download finished/i)).toBeInTheDocument();
    expect(screen.queryByText(/\bCompleted\b/)).toBeNull();
    expect(screen.getByRole('link', { name: 'Open again' })).toHaveAttribute(
      'href',
      'https://archive.org/download/night_of_the_living_dead/night.mp4',
    );
  });

  it('does not offer Open again for an unavailable record', async () => {
    const { backend, session } = await signedInBackend();
    await backend.putDownload(session.sessionId, {
      id: 'dl-2',
      providerId: 'archive',
      itemId: 'lend',
      itemTitle: 'Restricted scan',
      fileId: 'scan.pdf',
      fileName: 'scan.pdf',
      startedAt: '2026-10-26T12:00:00.000Z',
      status: 'unavailable',
      detail: 'Not downloadable. The provider requires borrowing, which this app does not support.',
    });

    renderPage(backend);

    expect(await screen.findByText(/requires borrowing/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open again' })).toBeNull();
  });
});
