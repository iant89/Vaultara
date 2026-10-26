/**
 * Browser-local account backend.
 *
 * Passwords are stored as PBKDF2 verifiers only. Session tokens live in this store, not in
 * localStorage. Every mutating call is authorized by a live session, so one account cannot
 * read or write another account's records.
 */

import {
  DEFAULT_PREFERENCES,
  normalizePreferences,
  type AccountRecord,
  type CreateAccountInput,
  type SessionRecord,
  type SignInInput,
  type UserPreferences,
} from '../models/account';
import { formatCanonicalId, type ContentIdentity } from '../models/identity';
import type { UserContentState } from '../models/userState';
import type {
  AccountBackend,
  PendingOperation,
  StoredContentState,
  StoredDownloadRecord,
  SyncResult,
  UserSnapshot,
} from './contract';
import { createPersistenceError } from './errors';
import { createIndexedDbKvStore } from './indexedDbKv';
import type { KvStore } from './kv';
import { mergeContentStates, mergePreferences } from './merge';
import { hashPassword, verifyPassword, type PasswordVerifier } from './passwords';
import { validateDisplayName, validateEmail, validatePassword } from './validation';

export const DEFAULT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface LocalAccountBackendOptions {
  readonly kv?: KvStore;
  readonly now?: () => Date;
  readonly pbkdf2Iterations?: number;
  readonly sessionTtlMs?: number;
  readonly randomId?: () => string;
}

interface StoredPreferences {
  readonly preferences: UserPreferences;
  readonly updatedAt: string;
}

const CURRENT_SESSION_KEY = 'session:current';

export function createLocalAccountBackend(
  options: LocalAccountBackendOptions = {},
): AccountBackend {
  const kv = options.kv ?? createIndexedDbKvStore();
  const now = options.now ?? (() => new Date());
  const sessionTtlMs = options.sessionTtlMs ?? DEFAULT_SESSION_TTL_MS;
  const randomId = options.randomId ?? defaultRandomId;
  const iterations = options.pbkdf2Iterations;

  async function requireSession(sessionId: string): Promise<SessionRecord> {
    const session = await kv.get(sessionKey(sessionId));

    if (!isSessionRecord(session)) {
      throw createPersistenceError('unauthorized', 'You are not signed in.');
    }

    if (Date.parse(session.expiresAt) <= now().getTime()) {
      await kv.delete(sessionKey(sessionId));
      const current = await kv.get(CURRENT_SESSION_KEY);

      if (current === sessionId) {
        await kv.delete(CURRENT_SESSION_KEY);
      }

      throw createPersistenceError('unauthorized', 'Your session has expired. Sign in again.');
    }

    return session;
  }

  async function writeSession(userId: string): Promise<SessionRecord> {
    const createdAt = now();
    const session: SessionRecord = {
      sessionId: randomId(),
      userId,
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + sessionTtlMs).toISOString(),
    };

    await kv.set(sessionKey(session.sessionId), session);
    await kv.set(CURRENT_SESSION_KEY, session.sessionId);
    return session;
  }

  async function enqueue(
    userId: string,
    kind: PendingOperation['kind'],
    payload: unknown,
    opId = randomId(),
  ): Promise<boolean> {
    const existing = await kv.get(pendingKey(userId, opId));

    if (existing !== undefined) {
      return false;
    }

    const operation: PendingOperation = {
      opId,
      userId,
      kind,
      payload,
      occurredAt: now().toISOString(),
    };

    await kv.set(pendingKey(userId, opId), operation);
    return true;
  }

  const backend: AccountBackend = {
    async createAccount(input: CreateAccountInput): Promise<SessionRecord> {
      const email = validateEmail(input.email);
      const password = validatePassword(input.password);
      const displayName = validateDisplayName(input.displayName);
      const existing = await kv.get(emailKey(email));

      if (typeof existing === 'string') {
        throw createPersistenceError('conflict', 'An account with that email already exists.');
      }

      const userId = randomId();
      const createdAt = now().toISOString();
      const verifier = await hashPassword(password, {
        ...(iterations !== undefined ? { iterations } : {}),
      });
      const account: AccountRecord = { userId, email, displayName, createdAt };

      await kv.set(accountKey(userId), account);
      await kv.set(emailKey(email), userId);
      await kv.set(credentialKey(userId), verifier);
      await kv.set(prefsKey(userId), {
        preferences: DEFAULT_PREFERENCES,
        updatedAt: createdAt,
      } satisfies StoredPreferences);

      return writeSession(userId);
    },

    async signIn(input: SignInInput): Promise<SessionRecord> {
      const email = validateEmail(input.email);
      const password = validatePassword(input.password);
      const userId = await kv.get(emailKey(email));
      const mismatch = createPersistenceError(
        'unauthorized',
        'That email or password is not correct.',
      );

      if (typeof userId !== 'string') {
        throw mismatch;
      }

      const verifier = await kv.get(credentialKey(userId));

      if (!isPasswordVerifier(verifier) || !(await verifyPassword(password, verifier))) {
        throw mismatch;
      }

      return writeSession(userId);
    },

    async signOut(sessionId: string): Promise<void> {
      await kv.delete(sessionKey(sessionId));
      const current = await kv.get(CURRENT_SESSION_KEY);

      if (current === sessionId) {
        await kv.delete(CURRENT_SESSION_KEY);
      }
    },

    async restoreCurrentSession(): Promise<SessionRecord | undefined> {
      const sessionId = await kv.get(CURRENT_SESSION_KEY);

      if (typeof sessionId !== 'string') {
        return undefined;
      }

      try {
        return await requireSession(sessionId);
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          (error as { code?: unknown }).code === 'unauthorized'
        ) {
          return undefined;
        }

        throw error;
      }
    },

    async getAccount(sessionId: string): Promise<AccountRecord> {
      const session = await requireSession(sessionId);
      const account = await kv.get(accountKey(session.userId));

      if (!isAccountRecord(account)) {
        throw createPersistenceError('not-found', 'That account could not be found.');
      }

      return account;
    },

    async getPreferences(sessionId: string): Promise<UserPreferences> {
      const stored = await readPreferences(kv, (await requireSession(sessionId)).userId);
      return stored.preferences;
    },

    async setPreferences(
      sessionId: string,
      preferences: UserPreferences,
      options: { readonly opId?: string } = {},
    ): Promise<UserPreferences> {
      const session = await requireSession(sessionId);
      const next = copyPreferences(preferences);
      const updatedAt = now().toISOString();
      const recorded = await enqueue(
        session.userId,
        'set-preferences',
        { preferences: next, updatedAt },
        options.opId,
      );

      if (!recorded) {
        return (await readPreferences(kv, session.userId)).preferences;
      }

      await kv.set(prefsKey(session.userId), {
        preferences: next,
        updatedAt,
      } satisfies StoredPreferences);
      return next;
    },

    async listContentState(sessionId: string): Promise<readonly StoredContentState[]> {
      const session = await requireSession(sessionId);
      const rows = await kv.list(contentPrefix(session.userId));

      return rows.flatMap((row) => (isStoredContentState(row.value) ? [row.value] : []));
    },

    async listDownloads(sessionId: string): Promise<readonly StoredDownloadRecord[]> {
      const session = await requireSession(sessionId);
      const rows = await kv.list(downloadPrefix(session.userId));

      return rows
        .flatMap((row) => (isStoredDownloadRecord(row.value) ? [row.value] : []))
        .sort(byStartedAtDesc);
    },

    async putDownload(
      sessionId: string,
      record: StoredDownloadRecord,
    ): Promise<StoredDownloadRecord> {
      const session = await requireSession(sessionId);

      if (!isStoredDownloadRecord(record)) {
        throw createPersistenceError('unavailable', 'That download record is not valid.');
      }

      if (record.downloadUrl !== undefined && !isHttpDownloadUrl(record.downloadUrl)) {
        throw createPersistenceError(
          'unavailable',
          'Download URLs must be http or https addresses.',
        );
      }

      await kv.set(downloadKey(session.userId, record.id), record);
      return record;
    },

    async getContentState(
      sessionId: string,
      identity: ContentIdentity,
    ): Promise<StoredContentState | undefined> {
      const session = await requireSession(sessionId);
      const value = await kv.get(contentKey(session.userId, identity));

      return isStoredContentState(value) ? value : undefined;
    },

    async putContentState(
      sessionId: string,
      state: UserContentState,
      options: { readonly opId?: string } = {},
    ): Promise<StoredContentState> {
      const session = await requireSession(sessionId);
      const stored: StoredContentState = {
        ...state,
        updatedAt: now().toISOString(),
      };
      const recorded = await enqueue(session.userId, 'put-content-state', stored, options.opId);

      if (!recorded) {
        const existing = await kv.get(contentKey(session.userId, stored));
        return isStoredContentState(existing) ? existing : stored;
      }

      await kv.set(contentKey(session.userId, stored), stored);
      return stored;
    },

    async deleteContentState(sessionId: string, identity: ContentIdentity): Promise<void> {
      const session = await requireSession(sessionId);
      await kv.delete(contentKey(session.userId, identity));
    },

    async pendingOperations(sessionId: string): Promise<readonly PendingOperation[]> {
      const session = await requireSession(sessionId);
      const rows = await kv.list(pendingPrefix(session.userId));

      return rows.flatMap((row) => (isPendingOperation(row.value) ? [row.value] : []));
    },

    async applyRemoteSnapshot(sessionId: string, remote: UserSnapshot): Promise<UserSnapshot> {
      const session = await requireSession(sessionId);
      const account = await backend.getAccount(sessionId);
      const localPrefs = await readPreferences(kv, session.userId);
      const localContent = await backend.listContentState(sessionId);
      const preferences = mergePreferences(
        localPrefs.preferences,
        remote.preferences,
        localPrefs.updatedAt,
        remote.preferencesUpdatedAt,
      );
      const preferencesUpdatedAt = laterIso(localPrefs.updatedAt, remote.preferencesUpdatedAt);
      const content = mergeContentStates(localContent, remote.content);

      await kv.set(prefsKey(session.userId), {
        preferences,
        updatedAt: preferencesUpdatedAt,
      } satisfies StoredPreferences);

      for (const state of content) {
        await kv.set(contentKey(session.userId, state), state);
      }

      return { account, preferences, preferencesUpdatedAt, content };
    },

    async synchronize(sessionId: string): Promise<SyncResult> {
      const session = await requireSession(sessionId);
      const pending = await backend.pendingOperations(sessionId);

      for (const operation of pending) {
        await kv.delete(pendingKey(session.userId, operation.opId));
      }

      return { mode: 'local', applied: pending.length, remaining: 0 };
    },
  };

  return backend;
}

async function readPreferences(kv: KvStore, userId: string): Promise<StoredPreferences> {
  const stored = await kv.get(prefsKey(userId));

  if (isStoredPreferences(stored)) {
    return {
      preferences: normalizePreferences(stored.preferences),
      updatedAt: stored.updatedAt,
    };
  }

  return { preferences: DEFAULT_PREFERENCES, updatedAt: new Date(0).toISOString() };
}

function copyPreferences(preferences: UserPreferences): UserPreferences {
  return {
    selectedCategoryIds: [...preferences.selectedCategoryIds],
    disabledProviderIds: [...preferences.disabledProviderIds],
    historyTrackingEnabled: preferences.historyTrackingEnabled,
    hideExploredFromDiscovery: preferences.hideExploredFromDiscovery,
    onboardingCompleted: preferences.onboardingCompleted,
  };
}

function laterIso(left: string, right: string): string {
  return Date.parse(left) >= Date.parse(right) ? left : right;
}

function defaultRandomId(): string {
  return crypto.randomUUID();
}

function accountKey(userId: string): string {
  return `account:${userId}`;
}

function emailKey(email: string): string {
  return `email:${email}`;
}

function credentialKey(userId: string): string {
  return `credential:${userId}`;
}

function sessionKey(sessionId: string): string {
  return `session:${sessionId}`;
}

function prefsKey(userId: string): string {
  return `prefs:${userId}`;
}

function contentPrefix(userId: string): string {
  return `content:${userId}:`;
}

function contentKey(userId: string, identity: ContentIdentity): string {
  return `${contentPrefix(userId)}${formatCanonicalId(identity)}`;
}

function downloadPrefix(userId: string): string {
  return `download:${userId}:`;
}

function downloadKey(userId: string, id: string): string {
  return `${downloadPrefix(userId)}${id}`;
}

function pendingPrefix(userId: string): string {
  return `pending:${userId}:`;
}

function pendingKey(userId: string, opId: string): string {
  return `${pendingPrefix(userId)}${opId}`;
}

function isAccountRecord(value: unknown): value is AccountRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record['userId'] === 'string' &&
    typeof record['email'] === 'string' &&
    typeof record['displayName'] === 'string' &&
    typeof record['createdAt'] === 'string'
  );
}

function isSessionRecord(value: unknown): value is SessionRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record['sessionId'] === 'string' &&
    typeof record['userId'] === 'string' &&
    typeof record['createdAt'] === 'string' &&
    typeof record['expiresAt'] === 'string'
  );
}

function isPasswordVerifier(value: unknown): value is PasswordVerifier {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record['salt'] === 'string' &&
    typeof record['hash'] === 'string' &&
    typeof record['iterations'] === 'number'
  );
}

function isStoredPreferences(value: unknown): value is StoredPreferences {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as { preferences?: unknown; updatedAt?: unknown };

  if (typeof record.updatedAt !== 'string' || typeof record.preferences !== 'object') {
    return false;
  }

  return record.preferences !== null;
}

function isStoredDownloadRecord(value: unknown): value is StoredDownloadRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record['id'] !== 'string' ||
    typeof record['providerId'] !== 'string' ||
    typeof record['itemId'] !== 'string' ||
    typeof record['itemTitle'] !== 'string' ||
    typeof record['fileId'] !== 'string' ||
    typeof record['fileName'] !== 'string' ||
    typeof record['startedAt'] !== 'string' ||
    (record['status'] !== 'opened' && record['status'] !== 'unavailable')
  ) {
    return false;
  }

  if (record['downloadUrl'] !== undefined && typeof record['downloadUrl'] !== 'string') {
    return false;
  }

  return true;
}

function byStartedAtDesc(left: StoredDownloadRecord, right: StoredDownloadRecord): number {
  return Date.parse(right.startedAt) - Date.parse(left.startedAt);
}

function isHttpDownloadUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isStoredContentState(value: unknown): value is StoredContentState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record['providerId'] === 'string' &&
    typeof record['itemId'] === 'string' &&
    typeof record['updatedAt'] === 'string' &&
    typeof record['liked'] === 'boolean' &&
    typeof record['favorited'] === 'boolean' &&
    typeof record['explored'] === 'boolean'
  );
}

function isPendingOperation(value: unknown): value is PendingOperation {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record['opId'] === 'string' &&
    typeof record['userId'] === 'string' &&
    typeof record['kind'] === 'string' &&
    typeof record['occurredAt'] === 'string'
  );
}
