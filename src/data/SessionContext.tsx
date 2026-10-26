/**
 * Signed-in account for the running interface.
 *
 * Components never open IndexedDB themselves. They read this context. Tests wrap a subtree
 * in `SessionProvider` with `createTestPersistence()` so they do not touch the live database.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { buildDownloadRecord } from '../downloads/record';
import {
  DEFAULT_PREFERENCES,
  type AccountRecord,
  type CreateAccountInput,
  type SignInInput,
  type UserPreferences,
} from '../models/account';
import type { DownloadDraft } from '../models/download';
import { formatCanonicalId, type ContentIdentity } from '../models/identity';
import type { FavoriteSnapshot, UserContentState, ViewerProgress } from '../models/userState';
import { getSharedPersistence } from '../persistence/composition';
import type {
  AccountBackend,
  StoredContentState,
  StoredDownloadRecord,
} from '../persistence/contract';
import {
  createPersistenceError,
  toPersistenceError,
  type PersistenceError,
} from '../persistence/errors';
import {
  shouldRetainAfterHistoryReset,
  withExploration,
  withoutExploration,
  withProgress,
} from '../personalization/exploration';
import { isEmptyContentState, withFavorite, withLike } from '../personalization/savedContent';

export type SessionStatus = 'loading' | 'signed-out' | 'signed-in';

export interface SessionContextValue {
  readonly status: SessionStatus;
  readonly account?: AccountRecord;
  readonly preferences: UserPreferences;
  readonly contentStates: readonly StoredContentState[];
  readonly downloads: readonly StoredDownloadRecord[];
  readonly createAccount: (input: CreateAccountInput) => Promise<UserPreferences>;
  readonly signIn: (input: SignInInput) => Promise<UserPreferences>;
  readonly signOut: () => Promise<void>;
  readonly setPreferences: (preferences: UserPreferences) => Promise<void>;
  readonly markExplored: (identity: ContentIdentity) => Promise<void>;
  readonly recordProgress: (identity: ContentIdentity, progress: ViewerProgress) => Promise<void>;
  readonly resetExplorationHistory: (options?: { readonly providerId?: string }) => Promise<void>;
  readonly toggleFavorite: (
    identity: ContentIdentity,
    next: boolean,
    snapshot?: FavoriteSnapshot,
  ) => Promise<void>;
  readonly toggleLike: (
    identity: ContentIdentity,
    next: boolean,
    snapshot?: FavoriteSnapshot,
  ) => Promise<void>;
  readonly recordDownload: (draft: DownloadDraft) => Promise<void>;
  readonly backend: AccountBackend;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

const unavailable = async (): Promise<never> => {
  throw createPersistenceError('unavailable', 'Account services are not available on this screen.');
};

const noop = async (): Promise<void> => {};

const FALLBACK: SessionContextValue = {
  status: 'signed-out',
  preferences: DEFAULT_PREFERENCES,
  contentStates: [],
  downloads: [],
  createAccount: unavailable,
  signIn: unavailable,
  signOut: unavailable,
  setPreferences: unavailable,
  markExplored: noop,
  recordProgress: noop,
  resetExplorationHistory: unavailable,
  toggleFavorite: unavailable,
  toggleLike: unavailable,
  recordDownload: noop,
  get backend(): AccountBackend {
    throw createPersistenceError(
      'unavailable',
      'Account services are not available on this screen.',
    );
  },
};

interface SessionProviderProps {
  readonly backend?: AccountBackend;
  readonly children: ReactNode;
}

export function SessionProvider({ backend, children }: SessionProviderProps) {
  const resolved = useMemo(() => backend ?? getSharedPersistence(), [backend]);
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [account, setAccount] = useState<AccountRecord | undefined>();
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [preferences, setPreferencesState] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [contentStates, setContentStates] = useState<readonly StoredContentState[]>([]);
  const [downloads, setDownloads] = useState<readonly StoredDownloadRecord[]>([]);
  const writeChain = useRef(Promise.resolve());

  const hydrate = useCallback(
    async (id: string): Promise<UserPreferences> => {
      const nextAccount = await resolved.getAccount(id);
      const nextPreferences = await resolved.getPreferences(id);
      const nextContent = await resolved.listContentState(id);
      const nextDownloads = await resolved.listDownloads(id);
      setAccount(nextAccount);
      setSessionId(id);
      setPreferencesState(nextPreferences);
      setContentStates(nextContent);
      setDownloads(nextDownloads);
      setStatus('signed-in');
      return nextPreferences;
    },
    [resolved],
  );

  useEffect(() => {
    let cancelled = false;

    void resolved
      .restoreCurrentSession()
      .then(async (session) => {
        if (cancelled) {
          return;
        }

        if (session === undefined) {
          setStatus('signed-out');
          setAccount(undefined);
          setSessionId(undefined);
          setPreferencesState(DEFAULT_PREFERENCES);
          setContentStates([]);
          setDownloads([]);
          return;
        }

        await hydrate(session.sessionId);
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('signed-out');
          setAccount(undefined);
          setSessionId(undefined);
          setPreferencesState(DEFAULT_PREFERENCES);
          setContentStates([]);
          setDownloads([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hydrate, resolved]);

  const createAccount = useCallback(
    async (input: CreateAccountInput) => {
      const session = await resolved.createAccount(input);
      return hydrate(session.sessionId);
    },
    [hydrate, resolved],
  );

  const signIn = useCallback(
    async (input: SignInInput) => {
      const session = await resolved.signIn(input);
      return hydrate(session.sessionId);
    },
    [hydrate, resolved],
  );

  const signOut = useCallback(async () => {
    if (sessionId !== undefined) {
      await resolved.signOut(sessionId);
    }

    setStatus('signed-out');
    setAccount(undefined);
    setSessionId(undefined);
    setPreferencesState(DEFAULT_PREFERENCES);
    setContentStates([]);
    setDownloads([]);
  }, [resolved, sessionId]);

  const setPreferences = useCallback(
    async (next: UserPreferences) => {
      if (sessionId === undefined) {
        throw createPersistenceError('unauthorized', 'You are not signed in.');
      }

      const saved = await resolved.setPreferences(sessionId, next);
      setPreferencesState(saved);
    },
    [resolved, sessionId],
  );

  const runExclusive = useCallback((task: () => Promise<void>) => {
    const next = writeChain.current.then(task, task);
    writeChain.current = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }, []);

  const markExplored = useCallback(
    async (identity: ContentIdentity) => {
      if (sessionId === undefined || !preferences.historyTrackingEnabled) {
        return;
      }

      await runExclusive(async () => {
        const existing = await resolved.getContentState(sessionId, identity);
        const saved = await resolved.putContentState(
          sessionId,
          withExploration(existing, identity, new Date().toISOString()),
        );
        setContentStates((current) => upsertContent(current, saved));
      });
    },
    [preferences.historyTrackingEnabled, resolved, runExclusive, sessionId],
  );

  const recordProgress = useCallback(
    async (identity: ContentIdentity, progress: ViewerProgress) => {
      if (sessionId === undefined || !preferences.historyTrackingEnabled) {
        return;
      }

      await runExclusive(async () => {
        const existing = await resolved.getContentState(sessionId, identity);
        const saved = await resolved.putContentState(
          sessionId,
          withProgress(existing, identity, progress, new Date().toISOString()),
        );
        setContentStates((current) => upsertContent(current, saved));
      });
    },
    [preferences.historyTrackingEnabled, resolved, runExclusive, sessionId],
  );

  const writeFlag = useCallback(
    async (
      identity: ContentIdentity,
      mutate: (existing: StoredContentState | undefined, now: string) => UserContentState,
    ) => {
      if (sessionId === undefined) {
        throw createPersistenceError('unauthorized', 'You are not signed in.');
      }

      const id = sessionId;
      const key = formatCanonicalId(identity);

      await runExclusive(async () => {
        const existing = await resolved.getContentState(id, identity);
        const previous = existing;
        const now = new Date().toISOString();
        const nextState = mutate(existing, now);
        setContentStates((current) =>
          isEmptyContentState(nextState)
            ? current.filter((state) => formatCanonicalId(state) !== key)
            : upsertContent(current, { ...nextState, updatedAt: now }),
        );

        try {
          if (isEmptyContentState(nextState)) {
            await resolved.deleteContentState(id, identity);
            return;
          }

          const saved = await resolved.putContentState(id, nextState);
          setContentStates((current) => upsertContent(current, saved));
        } catch (error) {
          setContentStates((current) => {
            if (previous === undefined) {
              return current.filter((state) => formatCanonicalId(state) !== key);
            }

            return upsertContent(current, previous);
          });
          throw error;
        }
      });
    },
    [resolved, runExclusive, sessionId],
  );

  const toggleFavorite = useCallback(
    async (identity: ContentIdentity, next: boolean, snapshot?: FavoriteSnapshot) => {
      await writeFlag(identity, (existing, now) =>
        withFavorite(existing, identity, next, now, snapshot),
      );
    },
    [writeFlag],
  );

  const toggleLike = useCallback(
    async (identity: ContentIdentity, next: boolean, snapshot?: FavoriteSnapshot) => {
      await writeFlag(identity, (existing) => withLike(existing, identity, next, snapshot));
    },
    [writeFlag],
  );

  const recordDownload = useCallback(
    async (draft: DownloadDraft) => {
      if (sessionId === undefined) {
        return;
      }

      const id = sessionId;
      const record = buildDownloadRecord(draft);

      await runExclusive(async () => {
        const saved = await resolved.putDownload(id, record);
        setDownloads((current) => [saved, ...current.filter((entry) => entry.id !== saved.id)]);
      });
    },
    [resolved, runExclusive, sessionId],
  );

  const resetExplorationHistory = useCallback(
    async (options: { readonly providerId?: string } = {}) => {
      if (sessionId === undefined) {
        throw createPersistenceError('unauthorized', 'You are not signed in.');
      }

      const id = sessionId;

      await runExclusive(async () => {
        const rows = await resolved.listContentState(id);
        const next: StoredContentState[] = [];

        for (const state of rows) {
          if (options.providerId !== undefined && state.providerId !== options.providerId) {
            next.push(state);
            continue;
          }

          if (shouldRetainAfterHistoryReset(state)) {
            const saved = await resolved.putContentState(id, withoutExploration(state));
            next.push(saved);
          } else {
            await resolved.deleteContentState(id, state);
          }
        }

        setContentStates(next);
      });
    },
    [resolved, runExclusive, sessionId],
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      ...(account !== undefined ? { account } : {}),
      preferences,
      contentStates,
      downloads,
      createAccount,
      signIn,
      signOut,
      setPreferences,
      markExplored,
      recordProgress,
      resetExplorationHistory,
      toggleFavorite,
      toggleLike,
      recordDownload,
      backend: resolved,
    }),
    [
      account,
      contentStates,
      createAccount,
      downloads,
      markExplored,
      preferences,
      recordDownload,
      recordProgress,
      resetExplorationHistory,
      resolved,
      setPreferences,
      signIn,
      signOut,
      status,
      toggleFavorite,
      toggleLike,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  return useContext(SessionContext) ?? FALLBACK;
}

export function describeSessionError(error: unknown): PersistenceError {
  return toPersistenceError(error);
}

function upsertContent(
  current: readonly StoredContentState[],
  next: StoredContentState,
): readonly StoredContentState[] {
  const key = formatCanonicalId(next);
  return [...current.filter((state) => formatCanonicalId(state) !== key), next];
}
