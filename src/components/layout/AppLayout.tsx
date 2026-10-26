import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '../../data/SessionContext';
import { useFocusMainOnNavigate } from '../../hooks/useFocusMainOnNavigate';
import { buildOnboardingPath } from '../../utils/links';
import { Navigation } from './Navigation';
import styles from './AppLayout.module.css';

const MAIN_ID = 'main-content';

export function AppLayout() {
  useFocusMainOnNavigate(MAIN_ID);
  const session = useSession();
  const location = useLocation();
  const needsOnboarding =
    session.status === 'signed-in' && !session.preferences.onboardingCompleted;
  const onboardingAllowed =
    location.pathname.startsWith('/onboarding') || location.pathname.startsWith('/settings');

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href={`#${MAIN_ID}`}>
        Skip to main content
      </a>
      <Navigation />
      {/* tabIndex allows the skip link and route changes to move focus here. */}
      <main id={MAIN_ID} className={styles.main} tabIndex={-1}>
        {needsOnboarding && !onboardingAllowed ? (
          <Navigate to={buildOnboardingPath()} replace />
        ) : (
          <Outlet />
        )}
      </main>
      <footer className={styles.footer}>
        <p>
          Content is provided by third-party sources. Vaultara respects provider permissions,
          licensing, and access restrictions.
        </p>
      </footer>
    </div>
  );
}
