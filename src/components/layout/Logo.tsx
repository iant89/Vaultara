import { Link } from 'react-router-dom';
import { VaultaraMark } from '../ui/icons';
import styles from './Navigation.module.css';

/**
 * Brand lockup: decorative vault mark plus the wordmark.
 *
 * The whole lockup is one link home. The mark is `aria-hidden`, so the accessible name is
 * simply "Vaultara" rather than an announcement of decorative geometry.
 */
export function Logo() {
  return (
    <Link to="/" className={styles.brand}>
      <VaultaraMark className={styles.brandMark} />
      <span className={styles.brandWord}>Vaultara</span>
    </Link>
  );
}
