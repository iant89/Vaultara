import { useId } from 'react';
import type { ReactNode } from 'react';
import { NotYetImplemented } from '../../components/feedback/NotYetImplemented';
import styles from './Settings.module.css';

/**
 * Settings subsections are grouped in one module because each is a thin wrapper around a
 * shared heading plus a status statement. They use `h2` so the page keeps a single `h1`.
 */
function SettingsSection({ heading, children }: { heading: string; children: ReactNode }) {
  const headingId = useId();

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.sectionTitle}>
        {heading}
      </h2>
      {children}
    </section>
  );
}

export function SettingsOverviewSection() {
  return (
    <SettingsSection heading="Overview">
      <NotYetImplemented
        feature="Account settings"
        summary="Accounts, sign-in, and cross-device synchronisation require the backend service. Until it exists, no user state is stored anywhere."
        plannedPhase="Phase 6"
      />
    </SettingsSection>
  );
}

export function SettingsCategoriesSection() {
  return (
    <SettingsSection heading="Categories">
      <NotYetImplemented
        feature="Category preferences"
        summary="Category selection from onboarding and preference editing. Changing preferences never deletes favourites or history."
        plannedPhase="Phase 7"
      />
    </SettingsSection>
  );
}

export function SettingsProvidersSection() {
  return (
    <SettingsSection heading="Providers">
      <NotYetImplemented
        feature="Provider settings"
        summary="Enabling and disabling providers. A disabled or failing provider is isolated and never breaks the others."
        plannedPhase="Phase 3"
      />
    </SettingsSection>
  );
}

export function SettingsPrivacySection() {
  return (
    <SettingsSection heading="Privacy">
      <NotYetImplemented
        feature="Privacy controls"
        summary="Exploration-history tracking, clearing, and deletion controls. History minimisation is a requirement, not an optional extra."
        plannedPhase="Phase 7"
      />
    </SettingsSection>
  );
}

export function SettingsContentSection() {
  return (
    <SettingsSection heading="Content visibility">
      <NotYetImplemented
        feature="Content visibility settings"
        summary="Controls that keep Adult content out of ordinary discovery and hide it in shared contexts such as the favourites list."
        plannedPhase="Phase 16"
      />
    </SettingsSection>
  );
}
