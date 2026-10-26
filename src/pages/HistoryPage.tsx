import { NotYetImplemented } from '../components/feedback/NotYetImplemented';
import { Page } from '../components/layout/Page';

export function HistoryPage() {
  return (
    <Page
      title="History"
      intro="Explored items, recorded only when an item's details page is opened or its viewer starts. Resetting history never removes favorites, likes, or category preferences."
    >
      <NotYetImplemented
        feature="Exploration history"
        summary="History records, per-provider clearing, and the discovery-filtering preference."
        plannedPhase="Phase 7"
      />
    </Page>
  );
}
