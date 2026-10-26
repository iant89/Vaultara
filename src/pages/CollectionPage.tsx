import { useParams } from 'react-router-dom';
import { NotYetImplemented } from '../components/feedback/NotYetImplemented';
import { Page } from '../components/layout/Page';

export function CollectionPage() {
  const { providerId = '', collectionId = '' } = useParams<{
    providerId: string;
    collectionId: string;
  }>();

  return (
    <Page
      title="Collection"
      intro={`Collection route identity: provider "${providerId}", collection "${collectionId}".`}
    >
      <NotYetImplemented
        feature="Collection pages"
        summary="Collection artwork, metadata, and a paginated item grid appear here. Opening a collection will never mark its items as explored; only opening an individual item does."
        plannedPhase="Phase 5"
      />
    </Page>
  );
}
