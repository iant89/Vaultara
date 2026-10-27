import { useState } from 'react';
import { appEnvironment } from '../../config/env';
import { describeSessionError, useSession } from '../../data/SessionContext';
import type { UserPreferences } from '../../models/account';
import styles from './Settings.module.css';

/**
 * Adult opt-in, local age confirmation, and shared-list hiding (design spec 13.3).
 *
 * Age confirmation is a device-local checkbox. This GitHub Pages build has no identity
 * verification, government ID check, or remote age service, and the copy says so.
 */
export function ContentVisibility() {
  const session = useSession();
  const [error, setError] = useState<string | undefined>();

  if (!appEnvironment.adultProviderEnabled) {
    return (
      <p className={styles.lede}>
        The Adult provider is disabled for this deployment. It cannot be turned on from Settings,
        and Adult items never appear in ordinary discovery.
      </p>
    );
  }

  if (session.status !== 'signed-in') {
    return (
      <p className={styles.lede}>
        Sign in to confirm you are of legal age and enable the Adult provider on this device. Until
        then it stays out of navigation, search, favorites, and history.
      </p>
    );
  }

  async function save(next: UserPreferences) {
    setError(undefined);

    try {
      await session.setPreferences(next);
    } catch (cause) {
      setError(describeSessionError(cause).message);
    }
  }

  const ageId = 'adult-age-confirmed';
  const optInId = 'adult-opt-in';
  const hideId = 'adult-hide-shared';

  return (
    <div className={styles.privacy}>
      <p className={styles.lede}>
        Adult content is isolated from Archive and Wikipedia discovery. Vaultara cannot verify your
        identity; confirming the age statement is a local acknowledgement that you are of legal age
        to view adult content where you are. Do not enable this provider on a shared or supervised
        device unless that is appropriate.
      </p>

      <div className={styles.providerList}>
        <div className={styles.providerRow}>
          <input
            id={ageId}
            type="checkbox"
            checked={session.preferences.adultAgeConfirmed}
            onChange={(event) => {
              const confirmed = event.target.checked;
              void save({
                ...session.preferences,
                adultAgeConfirmed: confirmed,
                adultOptIn: confirmed ? session.preferences.adultOptIn : false,
              });
            }}
          />
          <label className={styles.providerCopy} htmlFor={ageId}>
            <span className={styles.providerName}>I am of legal age to view adult content</span>
            <span className={styles.providerMeta}>
              Required before the Adult provider can be enabled. This is not identity verification.
            </span>
          </label>
        </div>
        <div className={styles.providerRow}>
          <input
            id={optInId}
            type="checkbox"
            checked={session.preferences.adultOptIn}
            disabled={!session.preferences.adultAgeConfirmed}
            onChange={(event) => {
              void save({
                ...session.preferences,
                adultOptIn: event.target.checked,
              });
            }}
          />
          <label className={styles.providerCopy} htmlFor={optInId}>
            <span className={styles.providerName}>Enable the Adult provider</span>
            <span className={styles.providerMeta}>
              Adds an Adult tab and includes Adult results in search on this device. Ordinary
              Archive and Wikipedia shelves stay unchanged.
            </span>
          </label>
        </div>
        <div className={styles.providerRow}>
          <input
            id={hideId}
            type="checkbox"
            checked={session.preferences.hideAdultInSharedLists}
            onChange={(event) => {
              void save({
                ...session.preferences,
                hideAdultInSharedLists: event.target.checked,
              });
            }}
          />
          <label className={styles.providerCopy} htmlFor={hideId}>
            <span className={styles.providerName}>Hide Adult items in Favorites and History</span>
            <span className={styles.providerMeta}>
              Saved Adult identities remain on this device. They are omitted from those lists so a
              shared screen does not preview them.
            </span>
          </label>
        </div>
      </div>

      {error !== undefined ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
