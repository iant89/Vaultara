import { Link } from 'react-router-dom';
import { useAsyncValue } from '../data/useAsyncValue';
import { useProviderServices } from '../data/ProviderServices';
import {
  DISCOVERY_ROWS,
  FEATURED_CATEGORY_ID,
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
import { NotYetImplemented } from '../components/feedback/NotYetImplemented';
import { Page } from '../components/layout/Page';
import { ProviderBadge } from '../components/ui/ProviderBadge';
import { ResponsiveGrid } from '../components/ui/ResponsiveGrid';
import { SkeletonCard, SkeletonGroup, SkeletonMedia } from '../components/ui/Skeleton';
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

const FEATURED_ROW =
  DISCOVERY_ROWS.find((row) => row.categoryId === FEATURED_CATEGORY_ID) ?? DISCOVERY_ROWS[0];

/** The most recently added item of the featured row, or nothing at all. */
function FeaturedSection({
  providerId,
  row,
}: {
  readonly providerId: string;
  readonly row: DiscoveryRowDefinition;
}) {
  const { state } = useCategoryRow(providerId, row);

  if (state.status === 'loading') {
    return (
      <SkeletonGroup label="Loading featured content">
        <div className={styles.featuredSkeleton}>
          <SkeletonMedia />
        </div>
      </SkeletonGroup>
    );
  }

  const item = state.status === 'ready' ? state.value.items[0] : undefined;

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
}: {
  readonly providerId: string;
  readonly row: DiscoveryRowDefinition;
  readonly viewAllHref?: string;
}) {
  const { state, reload } = useCategoryRow(providerId, row);

  return (
    <ItemRow
      title={row.title}
      description={row.description}
      {...(viewAllHref !== undefined ? { viewAllHref } : {})}
      state={state}
      reload={reload}
    />
  );
}

export function HomePage() {
  const { queries } = useProviderServices();
  const providerId = PRIMARY_PROVIDER_ID;

  // The category list decides which "View all" links would actually work; the rows themselves
  // resolve their own requests.
  const categories = useAsyncValue(`home:categories:${providerId}`, ({ signal, fresh }) =>
    queries.categories(providerId, { signal, fresh }),
  );

  const availableCategoryIds =
    categories.state.status === 'ready'
      ? new Set(categories.state.value.map((category) => category.id))
      : new Set<string>();

  return (
    <Page
      title="Discovery"
      intro="Recently added films, books, audio, images, software, and web archives from the Internet Archive."
    >
      {FEATURED_ROW !== undefined ? (
        <FeaturedSection providerId={providerId} row={FEATURED_ROW} />
      ) : null}

      {DISCOVERY_ROWS.map((row) => (
        <CategoryRow
          key={row.categoryId}
          providerId={providerId}
          row={row}
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

      <NotYetImplemented
        feature="Personal recommendations"
        summary="Recommendations based on what you open and like arrive with personalisation. Until then, discovery is the same for everyone and reflects only what the provider publishes."
        plannedPhase="Phase 7"
      />
    </Page>
  );
}
