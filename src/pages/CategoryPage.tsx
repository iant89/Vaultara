import { useParams, useSearchParams } from 'react-router-dom';
import { AsyncContent } from '../components/content/AsyncContent';
import { Breadcrumbs } from '../components/content/Breadcrumbs';
import { CollectionShelf } from '../components/content/CollectionShelf';
import { RowSkeleton } from '../components/content/ItemRow';
import { Pagination } from '../components/content/Pagination';
import { EmptyState } from '../components/feedback/EmptyState';
import { Page } from '../components/layout/Page';
import { PRIMARY_PROVIDER_ID } from '../config/discovery';
import { getProviderName } from '../config/providers';
import { useProviderServices } from '../data/ProviderServices';
import { useAsyncValue } from '../data/useAsyncValue';
import { nextSearchParams, parsePageParam, withSearchParams } from '../utils/contentParams';
import { buildCategoryPath, buildHomePath, buildProviderPath } from '../utils/links';

/**
 * Collection shelves per numbered page.
 *
 * Each shelf is its own items request, so this is a viewport of rows rather than a grid of
 * folder cards. Six keeps the page within the request limiter without inventing a second pager.
 */
export const COLLECTION_PAGE_SIZE = 6;

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

  // Collections come from the provider: a media type's contents are whatever it currently files
  // there, including collections nested deeper in the tree.
  const collections = useAsyncValue(
    `provider:collections:${providerId}:${categoryId}:${page}`,
    ({ signal, fresh }) =>
      queries.collections(
        providerId,
        categoryId,
        { page, pageSize: COLLECTION_PAGE_SIZE },
        { signal, fresh },
      ),
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
        loading={<RowSkeleton label="Loading collections" />}
      >
        {(result) =>
          result.items.length === 0 ? (
            <EmptyState
              title="No collections in this category"
              description={`${providerName} reported no collections for this category right now.`}
            />
          ) : (
            <>
              {result.items.map((collection) => (
                <CollectionShelf key={collection.id} collection={collection} />
              ))}

              <Pagination
                page={result.page}
                hasMore={result.hasMore}
                {...(result.total !== undefined ? { total: result.total } : {})}
                pageSize={result.pageSize}
                label="Collection pages"
                buildHref={(target) =>
                  withSearchParams(
                    buildCategoryPath(categoryId),
                    nextSearchParams(searchParams, { page: String(target) }),
                  )
                }
              />
            </>
          )
        }
      </AsyncContent>
    </Page>
  );
}
