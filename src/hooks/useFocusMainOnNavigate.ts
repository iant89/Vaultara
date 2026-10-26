import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Moves focus to the main landmark after a client-side navigation.
 *
 * A single-page app does not reset focus or announce a new page the way a document load
 * does; without this, keyboard and screen-reader users stay where they were and lose context
 * (design spec 27). The initial render is skipped so first paint does not steal focus, and
 * `tabIndex={-1}` on the target means no visible focus ring appears.
 */
export function useFocusMainOnNavigate(pathname: string) {
  const location = useLocation();
  const previousPathname = useRef(location.pathname);

  useEffect(() => {
    if (previousPathname.current === location.pathname) {
      return;
    }

    previousPathname.current = location.pathname;

    const main = document.getElementById(pathname);
    main?.focus();
  }, [location.pathname, pathname]);
}
