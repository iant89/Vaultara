import { Disclosure, DisclosureAction, DisclosureGroup, DisclosureItem } from '../ui/Disclosure';
import { AccountIcon } from '../ui/icons';
import { useSession } from '../../data/SessionContext';
import styles from './Navigation.module.css';

/**
 * Account and secondary navigation (design spec 4.2).
 *
 * Sign-in state is read from the session context. Sign out is a real action. The destinations
 * inside remain ordinary routes. Cross-device sync is not claimed: accounts stay on this device.
 */
export function AccountMenu() {
  const session = useSession();
  const signedIn = session.status === 'signed-in' && session.account !== undefined;

  return (
    <Disclosure
      triggerLabel="Account menu"
      triggerClassName={styles.actionButton}
      triggerContent={<AccountIcon />}
    >
      <p className={styles.menuStatus}>
        {session.status === 'loading'
          ? 'Checking account…'
          : signedIn
            ? `Signed in as ${session.account.displayName}. This account stays on this device.`
            : 'Not signed in. Create an account in Settings to keep preferences on this device. Accounts do not sync across devices.'}
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

      {signedIn ? (
        <DisclosureGroup title="Account">
          <DisclosureAction
            onClick={() => {
              void session.signOut();
            }}
          >
            Sign out
          </DisclosureAction>
        </DisclosureGroup>
      ) : session.status === 'signed-out' ? (
        <DisclosureGroup title="Account">
          <DisclosureItem to="/settings">Create account or sign in</DisclosureItem>
        </DisclosureGroup>
      ) : null}
    </Disclosure>
  );
}
