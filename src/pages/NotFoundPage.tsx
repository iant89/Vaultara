import { Link } from 'react-router-dom';
import { EmptyState } from '../components/feedback/EmptyState';
import { Page } from '../components/layout/Page';

export function NotFoundPage() {
  return (
    <Page title="Page not found">
      <EmptyState
        title="This address does not match any Vaultara route"
        description="Check the address, or use the navigation above to continue."
        action={<Link to="/">Go to discovery</Link>}
      />
    </Page>
  );
}
