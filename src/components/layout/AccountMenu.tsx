import { Disclosure, DisclosureGroup, DisclosureItem } from '../ui/Disclosure';
import { AccountIcon } from '../ui/icons';
import styles from './Navigation.module.css';

/**
 * Account and secondary navigation (design spec 4.2).
 *
 * Accounts, sign-in, and synchronisation arrive in Phase 6, so the panel states the current
 * status rather than presenting a signed-in identity or a sign-out action that would do
 * nothing. The destinations inside are real routes that each explain their own status.
 */
export function AccountMenu() {
  return (
    <Disclosure
      triggerLabel="Account menu"
      triggerClassName={styles.actionButton}
      triggerContent={<AccountIcon />}
    >
      <p className={styles.menuStatus}>
        Not signed in. Accounts and cross-device sync arrive in Phase 6, so preferences are not
        stored yet.
      </p>

      <DisclosureGroup title="Your library">
        <DisclosureItem to="/search">Search</DisclosureItem>
        <DisclosureItem to="/favorites">Favorites</DisclosureItem>
        <DisclosureItem to="/history">History</DisclosureItem>
        <DisclosureItem to="/downloads">Downloads</DisclosureItem>
      </DisclosureGroup>

      <DisclosureGroup title="Settings">
        <DisclosureItem to="/settings">Overview</DisclosureItem>
        <DisclosureItem to="/settings/categories">Categories</DisclosureItem>
        <DisclosureItem to="/settings/providers">Providers</DisclosureItem>
        <DisclosureItem to="/settings/privacy">Privacy</DisclosureItem>
        <DisclosureItem to="/settings/content">Content visibility</DisclosureItem>
      </DisclosureGroup>
    </Disclosure>
  );
}
