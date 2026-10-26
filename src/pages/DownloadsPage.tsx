import { NotYetImplemented } from '../components/feedback/NotYetImplemented';
import { Page } from '../components/layout/Page';

export function DownloadsPage() {
  return (
    <Page
      title="Downloads"
      intro="Download records for files the provider actually permits. A resolved link is not reported as a completed download."
    >
      <NotYetImplemented
        feature="Download management"
        summary="File selection, browser download handling, observable statuses, and retry actions."
        plannedPhase="Phase 10"
      />
    </Page>
  );
}
