import { NotYetImplemented } from '../components/feedback/NotYetImplemented';
import { Page } from '../components/layout/Page';

export function HomePage() {
  return (
    <Page
      title="Discovery"
      intro="A personalised home page: featured content followed by horizontally scrolling category rows of roughly 20 to 30 cards each."
    >
      <NotYetImplemented
        feature="Discovery"
        summary="Category rows, collection cards, and recommendations render here once the provider registry and the Internet Archive adapter exist. No content is fetched on this page yet."
        plannedPhase="Phases 3–5"
      />
    </Page>
  );
}
