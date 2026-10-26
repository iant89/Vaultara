import { useParams, useSearchParams } from 'react-router-dom';
import { AsyncContent } from '../components/content/AsyncContent';
import { Breadcrumbs } from '../components/content/Breadcrumbs';
import { Pagination } from '../components/content/Pagination';
import { Section } from '../components/content/Section';
import { EmptyState } from '../components/feedback/EmptyState';
import { Page } from '../components/layout/Page';
import { CollectionCard } from '../components/ui/CollectionCard';
import { ResponsiveGrid } from '../components/ui/ResponsiveGrid';
import { SkeletonCard, SkeletonGroup } from '../components/ui/Skeleton';
import { PRIMARY_PROVIDER_ID } from '../config/discovery';
import { getProviderName } from '../config/providers';
import { useProviderServices } from '../data/ProviderServices';
import { useAsyncValue } from '../data/useAsyncValue';
import type { ContentCollection } from '../models/content';
import { nextSearchParams, parsePageParam, withSearchParams } from '../utils/contentParams';
import { buildCategoryPath, buildHomePath, buildProviderPath } from '../utils/links';
import styles from './CategoryPage.module.css';

/** Placeholder cards while a page of collections resolves. */
const SKELETON_COUNT = 4;

export function CategoryPage() {
  const { categoryId = '' } = useParams<{ categoryId: string }>();
  const { queries } = useProviderServices();
  const [searchParams] = useSearchParams();

  const providerId = PRIMARY_PROVIDER_ID;
  const providerName = getProviderName(providerId);
  const page = parsePageParam(searchParams.get('page'));

  // The category's own name and description live in the provider's category list, which is
  // cached from whichever page linked here. Failing to resolve it costs a nicer title, not the
  // page: the collection list below reports its own failure.
  const categories = useAsyncValue(`provider:categories:${providerId}`, ({ signal, fresh }) =>
    queries.categories(providerId, { signal, fresh }),
  );

  const category =
    categories.state.status === 'ready'
      ? categories.state.value.find((entry) => entry.id === categoryId)
      : undefined;

  const collections = useAsyncValue(
    `provider:collections:${providerId}:${categoryId}:${page}`,
    ({ signal, fresh }) => queries.collections(providerId, categoryId, { page }, { signal, fresh }),
  );

  const title = category?.name ?? 'Category';
  const intro =
    category?.description ??
    (categories.state.status === 'ready' ? undefined : 'Choose a collection to browse its items.');

  return (
    <Page
      title={title}
      {...(intro !== undefined ? { intro } : {})}
      breadcrumbs={
        <Breadcrumbs
          items={[
            { label: 'Home', to: buildHomePath() },
            { label: providerName, to: buildProviderPath(providerId) },
            { label: title },
          ]}
        />
      }
    >
      <AsyncContent
        state={collections.state}
        reload={collections.reload}
        errorTitle="This category could not be loaded"
        missing={{
          title: 'Category not found',
          description: `${providerName} does not offer a category called “${categoryId}”.`,
        }}
        loading={
          <SkeletonGroup label="Loading collections">
            <div className={styles.skeletons}>
              {Array.from({ length: SKELETON_COUNT }, (_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          </SkeletonGroup>
        }
      >
        {(result) => (
          <Section
            title="Collections"
            description="Each collection groups items that belong together; open one to browse its contents."
          >
            {result.items.length === 0 ? (
              <EmptyState
                title="No collections in this category"
                description={`${providerName} reported no collections for this category right now.`}
              />
            ) : (
              <>
                <ResponsiveGrid label="Collections">
                  {result.items.map((collection: ContentCollection) => (
                    <CollectionCard
                      key={collection.id}
                      collection={collection}
                      providerName={getProviderName(collection.providerId)}
                    />
                  ))}
                </ResponsiveGrid>

                <Pagination
                  page={result.page}
                  hasMore={result.hasMore}
                  label="Collection pages"
                  buildHref={(target) =>
                    withSearchParams(
                      buildCategoryPath(categoryId),
                      nextSearchParams(searchParams, { page: String(target) }),
                    )
                  }
                />
              </>
            )}
          </Section>
        )}
      </AsyncContent>
    </Page>
  );
}
