import { useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { getProviderName } from '../../config/providers';
import { describeSessionError, useSession } from '../../data/SessionContext';
import { isExploredRecord } from '../../personalization/exploration';
import styles from './Settings.module.css';

export function PrivacyControls() {
  const session = useSession();
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  const exploredProviders = useMemo(() => {
    const ids = new Set(
      session.contentStates.filter(isExploredRecord).map((state) => state.providerId),
    );
    return [...ids];
  }, [session.contentStates]);

  if (session.status !== 'signed-in') {
    return (
      <p className={styles.lede}>
        Sign in to record exploration history and choose whether explored items stay off the home
        page.
      </p>
    );
  }

  async function saveFlag(
    field: 'historyTrackingEnabled' | 'hideExploredFromDiscovery',
    value: boolean,
  ) {
    setError(undefined);

    try {
      await session.setPreferences({
        ...session.preferences,
        [field]: value,
      });
    } catch (cause) {
      setError(describeSessionError(cause).message);
    }
  }

  async function reset(providerId?: string) {
    setPending(true);
    setError(undefined);

    try {
      await session.resetExplorationHistory(providerId === undefined ? {} : { providerId });
    } catch (cause) {
      setError(describeSessionError(cause).message);
    } finally {
      setPending(false);
    }
  }

  const trackingId = 'privacy-history-tracking';
  const hideId = 'privacy-hide-explored';

  return (
    <div className={styles.privacy}>
      <p className={styles.lede}>
        Exploration is recorded when you open an item&apos;s details or start its viewer, never
        because a collection was opened. Resetting history never removes likes, favorites, or
        category preferences.
      </p>

      <div className={styles.providerList}>
        <div className={styles.providerRow}>
          <input
            id={trackingId}
            type="checkbox"
            checked={session.preferences.historyTrackingEnabled}
            onChange={(event) => {
              void saveFlag('historyTrackingEnabled', event.target.checked);
            }}
          />
          <label className={styles.providerCopy} htmlFor={trackingId}>
            <span className={styles.providerName}>Record exploration history</span>
            <span className={styles.providerMeta}>
              When off, opening items does not add them to history or hide them from discovery.
            </span>
          </label>
        </div>
        <div className={styles.providerRow}>
          <input
            id={hideId}
            type="checkbox"
            checked={session.preferences.hideExploredFromDiscovery}
            onChange={(event) => {
              void saveFlag('hideExploredFromDiscovery', event.target.checked);
            }}
          />
          <label className={styles.providerCopy} htmlFor={hideId}>
            <span className={styles.providerName}>Hide explored items from discovery</span>
            <span className={styles.providerMeta}>
              Liked and favorited items stay eligible. Search and collection pages are never
              filtered.
            </span>
          </label>
        </div>
      </div>

      <div className={styles.actions}>
        <Button
          disabled={pending}
          onClick={() => {
            void reset();
          }}
        >
          Reset exploration history
        </Button>
        {exploredProviders.map((providerId) => (
          <Button
            key={providerId}
            disabled={pending}
            onClick={() => {
              void reset(providerId);
            }}
          >
            Clear {getProviderName(providerId)} history
          </Button>
        ))}
      </div>

      {error !== undefined ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
