import { useParams } from 'react-router-dom';
import { NotYetImplemented } from '../components/feedback/NotYetImplemented';
import { Page } from '../components/layout/Page';

export function ViewerPage() {
  const { providerId = '', itemId = '' } = useParams<{ providerId: string; itemId: string }>();

  return (
    <Page title="Viewer" intro={`Viewer route identity: "${providerId}:${itemId}".`}>
      <NotYetImplemented
        feature="The viewer system"
        summary="A viewer registry selects a specialised viewer from content metadata and file format, inside a shared container with favourite, download, and fullscreen controls. Unsupported formats fall back to a generic viewer instead of a blank page."
        plannedPhase="Phase 11"
      />
    </Page>
  );
}
