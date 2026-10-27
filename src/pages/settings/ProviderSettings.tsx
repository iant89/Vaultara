import { useState } from 'react';
import { getVisibleProviders } from '../../config/providers';
import { describeSessionError, useSession } from '../../data/SessionContext';
import { listConfigurableProviders } from '../../personalization/adultAccess';
import styles from './Settings.module.css';

export function ProviderSettings() {
  const session = useSession();
  const [error, setError] = useState<string | undefined>();
  const providers = listConfigurableProviders(getVisibleProviders(), session.preferences);

  if (session.status !== 'signed-in') {
    return (
      <p className={styles.lede}>
        Sign in to save which providers appear in navigation. Until then every configured provider
        is shown, and nothing is stored.
      </p>
    );
  }

  const disabled = new Set(session.preferences.disabledProviderIds);

  async function toggle(providerId: string, enabled: boolean) {
    const nextDisabled = new Set(session.preferences.disabledProviderIds);

    if (enabled) {
      nextDisabled.delete(providerId);
    } else {
      nextDisabled.add(providerId);
    }

    setError(undefined);

    try {
      await session.setPreferences({
        ...session.preferences,
        disabledProviderIds: [...nextDisabled],
      });
    } catch (cause) {
      setError(describeSessionError(cause).message);
    }
  }

  return (
    <div className={styles.providerList}>
      <p className={styles.lede}>
        Disabled providers leave navigation on this device. A provider without an adapter is still
        listed so it can be hidden before it exists.
      </p>
      {providers.map((provider) => {
        const enabled = !disabled.has(provider.id);
        const inputId = `provider-${provider.id}`;

        return (
          <div key={provider.id} className={styles.providerRow}>
            <input
              id={inputId}
              type="checkbox"
              checked={enabled}
              onChange={(event) => {
                void toggle(provider.id, event.target.checked);
              }}
            />
            <label className={styles.providerCopy} htmlFor={inputId}>
              <span className={styles.providerName}>{provider.name}</span>
              <span className={styles.providerMeta}>
                {provider.availability === 'planned'
                  ? `Not yet available (${provider.roadmapPhase})`
                  : provider.description}
              </span>
            </label>
          </div>
        );
      })}
      {error !== undefined ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
