import { NavLink, Outlet } from 'react-router-dom';
import { Page } from '../../components/layout/Page';
import { cx } from '../../utils/cx';
import styles from './Settings.module.css';

const SETTINGS_SECTIONS = [
  { to: '/settings/categories', label: 'Categories' },
  { to: '/settings/providers', label: 'Providers' },
  { to: '/settings/privacy', label: 'Privacy' },
  { to: '/settings/content', label: 'Content visibility' },
] as const;

function settingsLinkClassName({ isActive }: { isActive: boolean }): string {
  return cx(styles.link, isActive && styles.active);
}

export function SettingsPage() {
  return (
    <Page
      title="Settings"
      intro="Preferences for discovery, providers, privacy, and content visibility."
    >
      <nav aria-label="Settings sections" className={styles.nav}>
        <ul className={styles.navList}>
          {SETTINGS_SECTIONS.map((section) => (
            <li key={section.to}>
              <NavLink to={section.to} className={settingsLinkClassName}>
                {section.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </Page>
  );
}
