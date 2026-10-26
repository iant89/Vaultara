import { Outlet } from 'react-router-dom';
import { useFocusMainOnNavigate } from '../../hooks/useFocusMainOnNavigate';
import { Navigation } from './Navigation';
import styles from './AppLayout.module.css';

const MAIN_ID = 'main-content';

export function AppLayout() {
  useFocusMainOnNavigate(MAIN_ID);

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href={`#${MAIN_ID}`}>
        Skip to main content
      </a>
      <Navigation />
      {/* tabIndex allows the skip link and route changes to move focus here. */}
      <main id={MAIN_ID} className={styles.main} tabIndex={-1}>
        <Outlet />
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
