import { NotYetImplemented } from '../components/feedback/NotYetImplemented';
import { Page } from '../components/layout/Page';

export function FavoritesPage() {
  return (
    <Page
      title="Favorites"
      intro="One global favorites list shared by every provider. Likes are separate and only influence recommendations."
    >
      <NotYetImplemented
        feature="Global favorites"
        summary="Saved items, provider and content-type filters, and snapshot details that keep rendering when a provider is unavailable."
        plannedPhase="Phase 8"
      />
    </Page>
  );
}
