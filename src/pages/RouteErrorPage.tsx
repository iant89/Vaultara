import { Link, useRouteError } from 'react-router-dom';
import { ErrorState } from '../components/feedback/ErrorState';
import styles from '../components/layout/AppLayout.module.css';

/**
 * Fallback rendered when a route throws during rendering or loading. It replaces the
 * shared layout, so it supplies its own `main` landmark.
 */
export function RouteErrorPage() {
  const error = useRouteError();

  return (
    <main id="main-content" className={styles.main} tabIndex={-1}>
      <h1 className="sr-only">Vaultara error</h1>
      <ErrorState error={error} title="This page could not be displayed" />
      <p>
        <Link to="/">Return to discovery</Link>
      </p>
    </main>
  );
}
