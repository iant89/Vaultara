import { useId } from 'react';
import type { ReactNode } from 'react';
import { AccountPanel } from './AccountForms';
import { CategoryPreferences } from './CategoryPreferences';
import { ContentVisibility } from './ContentVisibility';
import { PrivacyControls } from './PrivacyControls';
import { ProviderSettings } from './ProviderSettings';
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
      <AccountPanel />
    </SettingsSection>
  );
}

export function SettingsCategoriesSection() {
  return (
    <SettingsSection heading="Categories">
      <CategoryPreferences />
    </SettingsSection>
  );
}

export function SettingsProvidersSection() {
  return (
    <SettingsSection heading="Providers">
      <ProviderSettings />
    </SettingsSection>
  );
}

export function SettingsPrivacySection() {
  return (
    <SettingsSection heading="Privacy">
      <PrivacyControls />
    </SettingsSection>
  );
}

export function SettingsContentSection() {
  return (
    <SettingsSection heading="Content visibility">
      <ContentVisibility />
    </SettingsSection>
  );
}
