import { NotYetImplemented } from '../components/feedback/NotYetImplemented';
import { Page } from '../components/layout/Page';

export function SearchPage() {
  return (
    <Page
      title="Search"
      intro="One query across every enabled provider, with results grouped by source and partial failures reported without discarding successful results."
    >
      <NotYetImplemented
        feature="Global search"
        summary="Search runs once provider adapters and the search coordinator exist. Results from one provider will remain visible when another provider fails."
        plannedPhase="Phase 9"
      />
    </Page>
  );
}
