/**
 * Documented account and user-state API (roadmap 6.1, design spec 2.2 and 21).
 *
 * GitHub Pages cannot host this service, so the running implementation is the local
 * IndexedDB backend. A remote HTTP adapter is not invented: `VITE_API_BASE_URL` remains a
 * reserved configuration value. Callers must not treat a signed-in session as cross-device.
 */

import type {
  AccountRecord,
  CreateAccountInput,
  SessionRecord,
  SignInInput,
  UserPreferences,
} from '../models/account';
import type { DownloadRecord } from '../models/download';
import type { ContentIdentity } from '../models/identity';
import type { UserContentState } from '../models/userState';

export interface StoredContentState extends UserContentState {
  readonly updatedAt: string;
}

/** A download attempt stored for the signed-in account. Local only; not synced. */
export type StoredDownloadRecord = DownloadRecord;

export type PendingOperationKind = 'set-preferences' | 'put-content-state';

export interface PendingOperation {
  readonly opId: string;
  readonly userId: string;
  readonly kind: PendingOperationKind;
  readonly payload: unknown;
  readonly occurredAt: string;
}

export interface UserSnapshot {
  readonly account: AccountRecord;
  readonly preferences: UserPreferences;
  readonly preferencesUpdatedAt: string;
  readonly content: readonly StoredContentState[];
}

export interface SyncResult {
  readonly mode: 'local';
  readonly applied: number;
  readonly remaining: number;
}

export interface AccountBackend {
  createAccount(input: CreateAccountInput): Promise<SessionRecord>;
  signIn(input: SignInInput): Promise<SessionRecord>;
  signOut(sessionId: string): Promise<void>;
  restoreCurrentSession(): Promise<SessionRecord | undefined>;
  getAccount(sessionId: string): Promise<AccountRecord>;

  getPreferences(sessionId: string): Promise<UserPreferences>;
  setPreferences(
    sessionId: string,
    preferences: UserPreferences,
    options?: { readonly opId?: string },
  ): Promise<UserPreferences>;

  listContentState(sessionId: string): Promise<readonly StoredContentState[]>;
  listDownloads(sessionId: string): Promise<readonly StoredDownloadRecord[]>;
  putDownload(sessionId: string, record: StoredDownloadRecord): Promise<StoredDownloadRecord>;
  getContentState(
    sessionId: string,
    identity: ContentIdentity,
  ): Promise<StoredContentState | undefined>;
  putContentState(
    sessionId: string,
    state: UserContentState,
    options?: { readonly opId?: string },
  ): Promise<StoredContentState>;
  deleteContentState(sessionId: string, identity: ContentIdentity): Promise<void>;

  pendingOperations(sessionId: string): Promise<readonly PendingOperation[]>;
  applyRemoteSnapshot(sessionId: string, remote: UserSnapshot): Promise<UserSnapshot>;
  synchronize(sessionId: string): Promise<SyncResult>;
}
