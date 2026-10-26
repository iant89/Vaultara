import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from '../models/account';
import { createTestPersistence } from './composition';
import { isPersistenceError } from './errors';
import { createMemoryKvStore } from './memoryKv';
import type { StoredContentState } from './contract';

const PASSWORD = 'correct horse';

function itemState(
  itemId: string,
  flags: Partial<StoredContentState> = {},
): Omit<StoredContentState, 'updatedAt'> {
  return {
    providerId: 'archive',
    itemId,
    liked: false,
    favorited: false,
    explored: false,
    ...flags,
  };
}

describe('local account backend', () => {
  it('creates an account, restores the session after a reload, and never stores the password', async () => {
    const kv = createMemoryKvStore();
    const backend = createTestPersistence({ kv });
    const session = await backend.createAccount({
      email: 'Alex@Example.com',
      password: PASSWORD,
      displayName: 'Alex',
    });
    const account = await backend.getAccount(session.sessionId);

    expect(account.email).toBe('alex@example.com');
    expect(account.displayName).toBe('Alex');

    const dumped = JSON.stringify(await kv.list(''));
    expect(dumped).not.toContain(PASSWORD);

    const reloaded = createTestPersistence({ kv });
    const restored = await reloaded.restoreCurrentSession();

    expect(restored?.userId).toBe(session.userId);
    expect((await reloaded.getAccount(restored?.sessionId ?? '')).displayName).toBe('Alex');
  });

  it('rejects a wrong password without saying which field was wrong', async () => {
    const backend = createTestPersistence();
    await backend.createAccount({
      email: 'alex@example.com',
      password: PASSWORD,
      displayName: 'Alex',
    });

    try {
      await backend.signIn({ email: 'alex@example.com', password: 'wrong horse' });
      expect.unreachable();
    } catch (error) {
      expect(isPersistenceError(error) && error.code).toBe('unauthorized');
      expect(isPersistenceError(error) && error.message).toMatch(/email or password/i);
    }
  });

  it('rejects a duplicate email', async () => {
    const backend = createTestPersistence();
    await backend.createAccount({
      email: 'alex@example.com',
      password: PASSWORD,
      displayName: 'Alex',
    });

    try {
      await backend.createAccount({
        email: 'ALEX@example.com',
        password: 'another horse',
        displayName: 'Alexis',
      });
      expect.unreachable();
    } catch (error) {
      expect(isPersistenceError(error) && error.code).toBe('conflict');
    }
  });

  it('keeps two accounts isolated', async () => {
    const backend = createTestPersistence();
    const alex = await backend.createAccount({
      email: 'alex@example.com',
      password: PASSWORD,
      displayName: 'Alex',
    });
    await backend.putContentState(alex.sessionId, itemState('night', { favorited: true }));
    await backend.signOut(alex.sessionId);

    const blair = await backend.createAccount({
      email: 'blair@example.com',
      password: PASSWORD,
      displayName: 'Blair',
    });

    expect(await backend.listContentState(blair.sessionId)).toEqual([]);

    const alexAgain = await backend.signIn({
      email: 'alex@example.com',
      password: PASSWORD,
    });
    const saved = await backend.listContentState(alexAgain.sessionId);

    expect(saved).toHaveLength(1);
    expect(saved[0]?.favorited).toBe(true);
  });

  it('expires a session and refuses the stored token', async () => {
    let now = Date.parse('2026-01-01T00:00:00.000Z');
    const backend = createTestPersistence({
      now: () => new Date(now),
      sessionTtlMs: 1_000,
    });
    const session = await backend.createAccount({
      email: 'alex@example.com',
      password: PASSWORD,
      displayName: 'Alex',
    });

    now += 1_001;

    try {
      await backend.getAccount(session.sessionId);
      expect.unreachable();
    } catch (error) {
      expect(isPersistenceError(error) && error.code).toBe('unauthorized');
      expect(isPersistenceError(error) && error.message).toMatch(/expired/i);
    }

    expect(await backend.restoreCurrentSession()).toBeUndefined();
  });

  it('clears the current session on sign-out', async () => {
    const backend = createTestPersistence();
    const session = await backend.createAccount({
      email: 'alex@example.com',
      password: PASSWORD,
      displayName: 'Alex',
    });

    await backend.signOut(session.sessionId);

    expect(await backend.restoreCurrentSession()).toBeUndefined();

    try {
      await backend.getPreferences(session.sessionId);
      expect.unreachable();
    } catch (error) {
      expect(isPersistenceError(error) && error.code).toBe('unauthorized');
    }
  });

  it('persists preferences, content state, and last-write-wins conflicts', async () => {
    const backend = createTestPersistence();
    const session = await backend.createAccount({
      email: 'alex@example.com',
      password: PASSWORD,
      displayName: 'Alex',
    });

    await backend.setPreferences(session.sessionId, {
      ...DEFAULT_PREFERENCES,
      disabledProviderIds: ['wikipedia'],
    });
    await backend.putContentState(session.sessionId, itemState('night', { favorited: true }));

    const remoteContent: StoredContentState = {
      ...itemState('night', { favorited: false, liked: true }),
      updatedAt: '2099-01-01T00:00:00.000Z',
    };

    const merged = await backend.applyRemoteSnapshot(session.sessionId, {
      account: await backend.getAccount(session.sessionId),
      preferences: DEFAULT_PREFERENCES,
      preferencesUpdatedAt: '2000-01-01T00:00:00.000Z',
      content: [remoteContent],
    });

    expect(merged.preferences.disabledProviderIds).toEqual(['wikipedia']);
    expect(merged.content[0]?.favorited).toBe(false);
    expect(merged.content[0]?.liked).toBe(true);
  });

  it('normalises older preference documents and can delete content state', async () => {
    const kv = createMemoryKvStore();
    const backend = createTestPersistence({ kv });
    const session = await backend.createAccount({
      email: 'alex@example.com',
      password: PASSWORD,
      displayName: 'Alex',
    });

    await kv.set(`prefs:${session.userId}`, {
      preferences: {
        selectedCategoryIds: ['movies'],
        disabledProviderIds: [],
        historyTrackingEnabled: true,
      },
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(await backend.getPreferences(session.sessionId)).toMatchObject({
      selectedCategoryIds: ['movies'],
      hideExploredFromDiscovery: true,
      onboardingCompleted: false,
    });

    await backend.putContentState(session.sessionId, itemState('night', { explored: true }));
    await backend.deleteContentState(session.sessionId, { providerId: 'archive', itemId: 'night' });

    expect(await backend.listContentState(session.sessionId)).toEqual([]);
  });

  it('ignores a duplicate operation id', async () => {
    const backend = createTestPersistence();
    const session = await backend.createAccount({
      email: 'alex@example.com',
      password: PASSWORD,
      displayName: 'Alex',
    });

    const first = await backend.putContentState(
      session.sessionId,
      itemState('night', { favorited: true }),
      { opId: 'op-1' },
    );
    const second = await backend.putContentState(
      session.sessionId,
      itemState('night', { favorited: false }),
      { opId: 'op-1' },
    );

    expect(second.favorited).toBe(true);
    expect(second.updatedAt).toBe(first.updatedAt);
    expect(await backend.pendingOperations(session.sessionId)).toHaveLength(1);
  });

  it('acknowledges local pending operations on synchronize', async () => {
    const backend = createTestPersistence();
    const session = await backend.createAccount({
      email: 'alex@example.com',
      password: PASSWORD,
      displayName: 'Alex',
    });
    await backend.putContentState(session.sessionId, itemState('night', { explored: true }));

    expect(await backend.pendingOperations(session.sessionId)).toHaveLength(1);

    const result = await backend.synchronize(session.sessionId);

    expect(result).toEqual({ mode: 'local', applied: 1, remaining: 0 });
    expect(await backend.pendingOperations(session.sessionId)).toEqual([]);
  });

  it('stores download attempts for the signed-in account and rejects unsafe URLs', async () => {
    const backend = createTestPersistence();
    const session = await backend.createAccount({
      email: 'alex@example.com',
      password: PASSWORD,
      displayName: 'Alex',
    });
    const opened = await backend.putDownload(session.sessionId, {
      id: 'dl-1',
      providerId: 'archive',
      itemId: 'night',
      itemTitle: 'Night of the Living Dead',
      fileId: 'night.mp4',
      fileName: 'night.mp4',
      downloadUrl: 'https://archive.org/download/night/night.mp4',
      startedAt: '2026-10-26T12:00:00.000Z',
      status: 'opened',
    });

    expect(opened.status).toBe('opened');
    expect(await backend.listDownloads(session.sessionId)).toEqual([opened]);

    const other = await backend.createAccount({
      email: 'sam@example.com',
      password: PASSWORD,
      displayName: 'Sam',
    });
    expect(await backend.listDownloads(other.sessionId)).toEqual([]);

    try {
      await backend.putDownload(session.sessionId, {
        ...opened,
        id: 'dl-bad',
        downloadUrl: 'javascript:alert(1)',
      });
      expect.unreachable();
    } catch (error) {
      expect(isPersistenceError(error) && error.message).toMatch(/http or https/i);
    }
  });
});
