import { NavLink } from 'react-router-dom';
import { getVisibleProviders } from '../../config/providers';
import { cx } from '../../utils/cx';
import { buildFavoritesPath, buildProviderPath } from '../../utils/links';
import { StarIcon } from '../ui/icons';
import { AccountMenu } from './AccountMenu';
import { Logo } from './Logo';
import { SearchControl } from './SearchControl';
import styles from './Navigation.module.css';

function navLinkClassName({ isActive }: { isActive: boolean }): string {
  return cx(styles.link, isActive && styles.active);
}

/**
 * Application top navigation (design spec 4.1, 4.3).
 *
 * Desktop: brand, provider tabs, search field, favourites, account menu.
 * Narrow viewports: brand, collapsible search, favourites, account menu, with provider tabs
 * on their own scrollable row. Favourites stay directly reachable at every width, and no
 * control depends on hover.
 */
export function Navigation() {
  const providers = getVisibleProviders();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Logo />

        <div className={styles.row}>
          <nav aria-label="Providers" className={styles.providerNav}>
            <ul className={styles.navList}>
              {providers.map((provider) => (
                <li key={provider.id}>
                  <NavLink
                    to={buildProviderPath(provider.id)}
                    className={navLinkClassName}
                    // The visible text is a prefix of the label, so "label in name" holds.
                    // The availability note stays out of the visual design.
                    aria-label={
                      provider.availability === 'planned'
                        ? `${provider.name} (not yet available)`
                        : undefined
                    }
                  >
                    {provider.name}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className={styles.actions}>
            <SearchControl />

            <NavLink
              to={buildFavoritesPath()}
              className={({ isActive }) => cx(styles.link, isActive && styles.active)}
            >
              <StarIcon />
              <span>Favorites</span>
            </NavLink>

            <AccountMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
