import { useState } from 'react';
import { CategoryPicker } from '../../components/content/CategoryPicker';
import { Button } from '../../components/ui/Button';
import { onboardingCategoryIds } from '../../config/onboarding';
import { describeSessionError, useSession } from '../../data/SessionContext';
import styles from './Settings.module.css';

export function CategoryPreferences() {
  const session = useSession();
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  if (session.status !== 'signed-in') {
    return (
      <p className={styles.lede}>
        Sign in to choose which categories appear on the home page. Until then every category is
        shown, and nothing is stored.
      </p>
    );
  }

  async function save(selectedCategoryIds: readonly string[]) {
    setPending(true);
    setError(undefined);

    try {
      await session.setPreferences({
        ...session.preferences,
        selectedCategoryIds,
        onboardingCompleted: true,
      });
    } catch (cause) {
      setError(describeSessionError(cause).message);
    } finally {
      setPending(false);
    }
  }

  const selectedIds = session.preferences.selectedCategoryIds;

  return (
    <div className={styles.categoryPrefs}>
      <p className={styles.lede}>
        These selections change which rows appear on discovery. They never delete favorites, likes,
        or exploration history.
      </p>
      <CategoryPicker
        selectedIds={selectedIds}
        disabled={pending}
        onChange={(next) => {
          void save(next);
        }}
      />
      <div className={styles.actions}>
        <Button
          disabled={pending}
          onClick={() => {
            void save(onboardingCategoryIds());
          }}
        >
          Select all
        </Button>
        <Button
          disabled={pending}
          onClick={() => {
            void save([]);
          }}
        >
          Clear all
        </Button>
      </div>
      {error !== undefined ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
