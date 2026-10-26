import { useParams } from 'react-router-dom';
import { EmptyState } from '../components/feedback/EmptyState';
import { NotYetImplemented } from '../components/feedback/NotYetImplemented';
import { Page } from '../components/layout/Page';
import { appEnvironment } from '../config/env';
import { findProvider } from '../config/providers';

export function ProviderPage() {
  const { providerId = '' } = useParams<{ providerId: string }>();

  if (providerId.length === 0) {
    return (
      <Page title="Provider">
        <EmptyState
          title="No provider was specified"
          description="Choose a provider from the navigation to browse its content."
        />
      </Page>
    );
  }

  // The Adult provider is opt-in and must be hidden when not explicitly enabled
  // (design spec 13.2, 13.3).
  if (providerId === 'adult' && !appEnvironment.adultProviderEnabled) {
    return (
      <Page title="Adult provider">
        <EmptyState
          title="The Adult provider is disabled"
          description="This provider is opt-in and disabled by default. It must only be enabled where the applicable access requirements are met, and its content never appears in ordinary discovery or in recommendations from other providers."
        />
      </Page>
    );
  }

  const provider = findProvider(providerId);

  if (provider === undefined) {
    return (
      <Page title="Unknown provider">
        <EmptyState
          title={`No provider is configured as "${providerId}"`}
          description="Check the address, or use the navigation to choose an available provider."
        />
      </Page>
    );
  }

  return (
    <Page title={provider.name} intro={provider.description}>
      <NotYetImplemented
        feature={`${provider.name} browsing`}
        summary="Search, categories, and collections for this provider appear here once its adapter implements the shared provider contract."
        plannedPhase={provider.roadmapPhase}
      />
    </Page>
  );
}
