import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAsyncValue, type AsyncState } from '../data/useAsyncValue';
import { useProviderServices } from '../data/ProviderServices';
import { useSession } from '../data/SessionContext';
import {
  PRIMARY_PROVIDER_ID,
  ROW_PAGE_SIZE,
  type DiscoveryRowDefinition,
} from '../config/discovery';
import { getProviderName } from '../config/providers';
import { AsyncContent } from '../components/content/AsyncContent';
import { CategoryCard } from '../components/content/CategoryCard';
import { FeaturedItem } from '../components/content/FeaturedItem';
import { ItemRow } from '../components/content/ItemRow';
import { Section } from '../components/content/Section';
import { EmptyState } from '../components/feedback/EmptyState';
import { Page } from '../components/layout/Page';
import { ProviderBadge } from '../components/ui/ProviderBadge';
import { ResponsiveGrid } from '../components/ui/ResponsiveGrid';
import { SkeletonCard, SkeletonGroup, SkeletonMedia } from '../components/ui/Skeleton';
import type { ContentItem } from '../models/content';
import type { PaginatedResult } from '../models/pagination';
import type { UserContentState } from '../models/userState';
import { filterDiscoveryItems, indexContentStates } from '../personalization/discoveryFilter';
import { featuredRowFor, rowsForCategories } from '../personalization/discoveryRows';
import { buildCategoryPath, buildProviderPath } from '../utils/links';
import styles from './HomePage.module.css';

/**
 * One row's request.
 *
 * The featured slot and the row it promotes call this with the same arguments, so the query layer
 * serves both from a single request — promoting an item costs nothing extra.
 */
function useCategoryRow(providerId: string, row: DiscoveryRowDefinition) {
  const { queries } = useProviderServices();

  return useAsyncValue(`home:row:${providerId}:${row.categoryId}`, ({ signal, fresh }) =>
    queries.search(
      providerId,
      '',
      { contentTypes: row.contentTypes, sort: 'added-desc', pageSize: ROW_PAGE_SIZE },
      { signal, fresh },
    ),
  );
}

function useDiscoveryFilter() {
  const session = useSession();
  const hideExplored =
    session.status === 'signed-in' && session.preferences.hideExploredFromDiscovery;
  const states = useMemo(() => indexContentStates(session.contentStates), [session.contentStates]);

  return { hideExplored, states, selectedCategoryIds: session.preferences.selectedCategoryIds };
}

function filterRowState(
  state: AsyncState<PaginatedResult<ContentItem>>,
  states: ReadonlyMap<string, UserContentState>,
  hideExplored: boolean,
): AsyncState<PaginatedResult<ContentItem>> {
  if (state.status !== 'ready') {
    return state;
  }

  return {
    ...state,
    value: {
      ...state.value,
      items: filterDiscoveryItems(state.value.items, states, hideExplored),
    },
  };
}

function FeaturedSection({
  providerId,
  row,
  states,
  hideExplored,
}: {
  readonly providerId: string;
  readonly row: DiscoveryRowDefinition;
  readonly states: ReadonlyMap<string, UserContentState>;
  readonly hideExplored: boolean;
}) {
  const { state } = useCategoryRow(providerId, row);
  const filtered = filterRowState(state, states, hideExplored);

  if (filtered.status === 'loading') {
    return (
      <SkeletonGroup label="Loading featured content">
        <div className={styles.featuredSkeleton}>
          <SkeletonMedia />
        </div>
      </SkeletonGroup>
    );
  }

  const item = filtered.status === 'ready' ? filtered.value.items[0] : undefined;

  if (item === undefined) {
    // A failed or empty featured row is not an error worth its own panel: the row below reports
    // the same failure, and the page stays readable without a hero.
    return null;
  }

  return (
    <FeaturedItem
      item={item}
      badge={
        <ProviderBadge
          providerId={item.providerId}
          providerName={getProviderName(item.providerId)}
        />
      }
    />
  );
}

function CategoryRow({
  providerId,
  row,
  viewAllHref,
  states,
  hideExplored,
}: {
  readonly providerId: string;
  readonly row: DiscoveryRowDefinition;
  readonly viewAllHref?: string;
  readonly states: ReadonlyMap<string, UserContentState>;
  readonly hideExplored: boolean;
}) {
  const { state, reload } = useCategoryRow(providerId, row);

  return (
    <ItemRow
      title={row.title}
      description={row.description}
      {...(viewAllHref !== undefined ? { viewAllHref } : {})}
      state={filterRowState(state, states, hideExplored)}
      reload={reload}
    />
  );
}

export function HomePage() {
  const { queries } = useProviderServices();
  const providerId = PRIMARY_PROVIDER_ID;
  const { hideExplored, states, selectedCategoryIds } = useDiscoveryFilter();
  const rows = rowsForCategories(selectedCategoryIds);
  const featured = featuredRowFor(rows);

  // The category list decides which "View all" links would actually work; the rows themselves
  // resolve their own requests.
  const categories = useAsyncValue(`home:categories:${providerId}`, ({ signal, fresh }) =>
    queries.categories(providerId, { signal, fresh }),
  );

  const availableCategoryIds =
    categories.state.status === 'ready'
      ? new Set(categories.state.value.map((category) => category.id))
      : new Set<string>();

  const intro =
    selectedCategoryIds.length > 0
      ? 'Recently added titles from the categories you chose. Change them any time in Settings.'
      : 'Recently added films, books, audio, images, software, and web archives from the Internet Archive.';

  return (
    <Page title="Discovery" intro={intro}>
      {featured !== undefined ? (
        <FeaturedSection
          providerId={providerId}
          row={featured}
          states={states}
          hideExplored={hideExplored}
        />
      ) : null}

      {rows.map((row) => (
        <CategoryRow
          key={row.categoryId}
          providerId={providerId}
          row={row}
          states={states}
          hideExplored={hideExplored}
          {...(availableCategoryIds.has(row.categoryId)
            ? { viewAllHref: buildCategoryPath(row.categoryId) }
            : {})}
        />
      ))}

      <Section
        title="Browse by category"
        description="Every category this provider offers, with its collections."
        action={
          <Link className={styles.browseAll} to={buildProviderPath(providerId)}>
            All of {getProviderName(providerId)}
          </Link>
        }
      >
        <AsyncContent
          state={categories.state}
          reload={categories.reload}
          errorTitle="Categories could not be loaded"
          loading={
            <SkeletonGroup label="Loading categories">
              <div className={styles.categorySkeletons}>
                {Array.from({ length: 6 }, (_, index) => (
                  <SkeletonCard key={index} />
                ))}
              </div>
            </SkeletonGroup>
          }
        >
          {(values) =>
            values.length === 0 ? (
              <EmptyState
                title="No categories are available"
                description="This provider did not report any browsable categories."
              />
            ) : (
              <ResponsiveGrid label="Categories">
                {values.map((category) => (
                  <CategoryCard key={category.id} category={category} />
                ))}
              </ResponsiveGrid>
            )
          }
        </AsyncContent>
      </Section>
    </Page>
  );
}
