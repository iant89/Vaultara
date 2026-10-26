import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CategoryPicker } from '../components/content/CategoryPicker';
import { LoadingState } from '../components/feedback/LoadingState';
import { Page } from '../components/layout/Page';
import { Button } from '../components/ui/Button';
import { onboardingCategoryIds } from '../config/onboarding';
import { describeSessionError, useSession } from '../data/SessionContext';
import type { UserPreferences } from '../models/account';
import { buildHomePath, buildSettingsPath } from '../utils/links';
import styles from './OnboardingPage.module.css';

export function OnboardingPage() {
  const session = useSession();

  if (session.status === 'loading') {
    return <LoadingState label="Checking account…" />;
  }

  if (session.status === 'signed-out') {
    return <Navigate to={buildSettingsPath()} replace />;
  }

  return <OnboardingForm preferences={session.preferences} onSave={session.setPreferences} />;
}

function OnboardingForm({
  preferences,
  onSave,
}: {
  readonly preferences: UserPreferences;
  readonly onSave: (preferences: UserPreferences) => Promise<void>;
}) {
  const [selectedIds, setSelectedIds] = useState<readonly string[]>(
    preferences.selectedCategoryIds,
  );
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const [finished, setFinished] = useState(false);

  if (finished) {
    return <Navigate to={buildHomePath()} replace />;
  }

  async function persist(nextIds: readonly string[]) {
    setPending(true);
    setError(undefined);

    try {
      await onSave({
        ...preferences,
        selectedCategoryIds: nextIds,
        onboardingCompleted: true,
      });
      setFinished(true);
    } catch (cause) {
      setError(describeSessionError(cause).message);
      setPending(false);
    }
  }

  return (
    <Page
      title="Choose your categories"
      intro="Pick the kinds of content you want to see first. You can change this later in Settings. Skip to keep every category on the home page."
    >
      <CategoryPicker selectedIds={selectedIds} onChange={setSelectedIds} disabled={pending} />

      <div className={styles.actions}>
        <Button
          disabled={pending}
          onClick={() => {
            setSelectedIds(onboardingCategoryIds());
          }}
        >
          Select all
        </Button>
        <Button
          disabled={pending}
          onClick={() => {
            setSelectedIds([]);
          }}
        >
          Clear all
        </Button>
        <Button
          variant="primary"
          disabled={pending || selectedIds.length === 0}
          onClick={() => {
            void persist(selectedIds);
          }}
        >
          Continue
        </Button>
        <Button
          disabled={pending}
          onClick={() => {
            void persist(preferences.selectedCategoryIds);
          }}
        >
          Skip
        </Button>
      </div>

      {error !== undefined ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </Page>
  );
}
