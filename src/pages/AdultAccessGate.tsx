import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '../components/feedback/EmptyState';
import { Page } from '../components/layout/Page';
import { ADULT_PROVIDER_ID } from '../config/adult';
import { appEnvironment } from '../config/env';
import { useSession } from '../data/SessionContext';
import { isAdultContentAccessible } from '../personalization/adultAccess';
import { buildSettingsPath } from '../utils/links';

/**
 * Blocks Adult routes until the deploy flag, age confirmation, and opt-in are all in place.
 *
 * Mounted around provider/item/collection/viewer pages so those pages never issue a request
 * for Adult content the reader is not allowed to see (design spec 13.2, 13.3).
 */
export function AdultAccessGate({ children }: { readonly children: ReactNode }) {
  const { providerId = '' } = useParams<{ providerId: string }>();
  const session = useSession();

  if (providerId !== ADULT_PROVIDER_ID) {
    return children;
  }

  if (!appEnvironment.adultProviderEnabled) {
    return (
      <Page title="Adult provider">
        <EmptyState
          title="The Adult provider is disabled"
          description="This provider is opt-in and disabled by default. It must only be enabled where the applicable access requirements are met, and its content never appears in ordinary discovery or in recommendations from other providers."
        />
      </Page>
    );
  }

  if (!isAdultContentAccessible(session.preferences)) {
    return (
      <Page title="Adult provider">
        <EmptyState
          title="The Adult provider is not enabled on this account"
          description="Confirm you are of legal age and opt in under Content visibility. Adult items never appear in ordinary Archive or Wikipedia discovery."
          action={
            <Link to={buildSettingsPath('content')}>
              {session.status === 'signed-in'
                ? 'Open content visibility'
                : 'Sign in to enable Adult'}
            </Link>
          }
        />
      </Page>
    );
  }

  return children;
}
