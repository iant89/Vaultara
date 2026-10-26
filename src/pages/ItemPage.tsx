import { useParams } from 'react-router-dom';
import { NotYetImplemented } from '../components/feedback/NotYetImplemented';
import { Page } from '../components/layout/Page';

export function ItemPage() {
  const { providerId = '', itemId = '' } = useParams<{ providerId: string; itemId: string }>();

  return (
    <Page
      title="Item details"
      intro={`Canonical content identity: "${providerId}:${itemId}". A provider id is always part of the identity because item ids are not globally unique.`}
    >
      <NotYetImplemented
        feature="Item details"
        summary="Provider metadata, available files, favourite and like actions, and viewer selection appear here once provider adapters exist."
        plannedPhase="Phases 4–5"
      />
    </Page>
  );
}
