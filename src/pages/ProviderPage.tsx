import { useParams } from 'react-router-dom';
import { useAsyncValue } from '../data/useAsyncValue';
import { useProviderServices } from '../data/ProviderServices';
import { CategoryCard } from '../components/content/CategoryCard';
import { ItemRow } from '../components/content/ItemRow';
import { Section } from '../components/content/Section';
import { EmptyState } from '../components/feedback/EmptyState';
import { ErrorState } from '../components/feedback/ErrorState';
import { NotYetImplemented } from '../components/feedback/NotYetImplemented';
import { Page } from '../components/layout/Page';
import { ResponsiveGrid } from '../components/ui/ResponsiveGrid';
import { SkeletonCard, SkeletonGroup } from '../components/ui/Skeleton';
import { ROW_PAGE_SIZE } from '../config/discovery';
import { findProvider, type ProviderCatalogEntry } from '../config/providers';
import styles from './ProviderPage.module.css';

/**
 * Categories for a provider whose adapter exists.
 *
 * Split from the route component so that a provider without an adapter never issues a request:
 * calling a provider that is not registered would record a failure against it and blame the
 * provider for something the interface chose to do.
 */
function ProviderPopular({ provider }: { readonly provider: ProviderCatalogEntry }) {
  const { queries } = useProviderServices();
  const { state, reload } = useAsyncValue(`provider:popular:${provider.id}`, ({ signal, fresh }) =>
    queries.search(
      provider.id,
      '',
      { sort: 'added-desc', pageSize: ROW_PAGE_SIZE },
      { signal, fresh },
    ),
  );

  if (state.status === 'ready' && state.value.items.length === 0) {
    return null;
  }

  return (
    <ItemRow
      title="Popular now"
      description="A first look at this provider, isolated from the others so a failure here cannot blank the rest of discovery."
      state={state}
      reload={reload}
    />
  );
}

function ProviderCategories({ provider }: { readonly provider: ProviderCatalogEntry }) {
  const { queries } = useProviderServices();
  const { state, reload } = useAsyncValue(
    `provider:categories:${provider.id}`,
    ({ signal, fresh }) => queries.categories(provider.id, { signal, fresh }),
  );

  return (
    <Section
      title="Browse by category"
      description="Each category holds the provider’s collections, and each collection holds its items."
    >
      {state.status === 'loading' ? (
        <SkeletonGroup label="Loading categories">
          <div className={styles.skeletons}>
            {Array.from({ length: 6 }, (_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        </SkeletonGroup>
      ) : state.status === 'error' ? (
        <ErrorState error={state.error} title="Categories could not be loaded" onRetry={reload} />
      ) : state.value.length === 0 ? (
        <EmptyState
          title="No categories are available"
          description="This provider reported that it has no browsable categories."
        />
      ) : (
        <ResponsiveGrid label="Categories">
          {state.value.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </ResponsiveGrid>
      )}
    </Section>
  );
}

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

  // Two different things can be missing, and conflating them would misreport progress: a provider
  // without an adapter cannot serve data at all, while one with an adapter still needs browsing
  // surfaces wired to it.
  if (provider.availability !== 'available') {
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

  return (
    <Page title={provider.name} intro={provider.description}>
      <ProviderPopular provider={provider} />
      <ProviderCategories provider={provider} />
    </Page>
  );
}
