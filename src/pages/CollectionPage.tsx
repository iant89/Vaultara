import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AsyncContent } from '../components/content/AsyncContent';
import { Breadcrumbs } from '../components/content/Breadcrumbs';
import { CollectionToolbar } from '../components/content/CollectionToolbar';
import { Pagination } from '../components/content/Pagination';
import { Section } from '../components/content/Section';
import { EmptyState } from '../components/feedback/EmptyState';
import { Page } from '../components/layout/Page';
import { Artwork } from '../components/ui/Artwork';
import { CollectionCard } from '../components/ui/CollectionCard';
import { CONTENT_TYPE_LABELS, ItemCard } from '../components/ui/ItemCard';
import { ProviderBadge } from '../components/ui/ProviderBadge';
import { ResponsiveGrid } from '../components/ui/ResponsiveGrid';
import { SkeletonCard, SkeletonGroup } from '../components/ui/Skeleton';
import { getProviderName } from '../config/providers';
import { getDeclaredContentTypes } from '../data/providerCapabilities';
import { useProviderServices } from '../data/ProviderServices';
import { useAsyncValue } from '../data/useAsyncValue';
import type { ContentCollection } from '../models/content';
import type { PaginatedResult } from '../models/pagination';
import {
  COLLECTION_SORT_OPTIONS,
  nextSearchParams,
  parseContentTypeParam,
  parsePageParam,
  parseSortParam,
  withSearchParams,
} from '../utils/contentParams';
import { formatItemCount } from '../utils/format';
import {
  buildCategoryPath,
  buildCollectionPath,
  buildHomePath,
  buildProviderPath,
} from '../utils/links';
import styles from './CollectionPage.module.css';

/** Cards per page: one row of a wide grid, and the size discovery rows ask for. */
const PAGE_SIZE = 24;

/** Related collections shown beneath the grid; enough to be useful, few enough to stay a row. */
const RELATED_LIMIT = 6;

const EMPTY_PAGE: PaginatedResult<ContentCollection> = {
  items: [],
  page: 1,
  pageSize: 0,
  hasMore: false,
};

export function CollectionPage() {
  const { providerId = '', collectionId = '' } = useParams<{
    providerId: string;
    collectionId: string;
  }>();
  const { queries, runtime } = useProviderServices();
  const [searchParams, setSearchParams] = useSearchParams();

  const providerName = getProviderName(providerId);
  const page = parsePageParam(searchParams.get('page'));
  const sort = parseSortParam(searchParams.get('sort'));
  const contentType = parseContentTypeParam(searchParams.get('type'));
  const query = searchParams.get('q')?.trim() ?? '';
  const hasFilters = query !== '' || contentType !== undefined;

  const collection = useAsyncValue(
    `collection:${providerId}:${collectionId}`,
    ({ signal, fresh }) => queries.collection(providerId, collectionId, { signal, fresh }),
  );

  const items = useAsyncValue(
    `collection-items:${providerId}:${collectionId}:${page}:${sort ?? ''}:${contentType ?? ''}:${query}`,
    ({ signal, fresh }) =>
      queries.collectionItems(
        providerId,
        collectionId,
        {
          page,
          pageSize: PAGE_SIZE,
          ...(sort !== undefined ? { sort } : {}),
          ...(contentType !== undefined ? { contentTypes: [contentType] } : {}),
          ...(query !== '' ? { query } : {}),
        },
        { signal, fresh },
      ),
  );

  const categories = useAsyncValue(`provider:categories:${providerId}`, ({ signal, fresh }) =>
    queries.categories(providerId, { signal, fresh }),
  );

  const collectionValue = collection.state.status === 'ready' ? collection.state.value : undefined;
  const categoryId = collectionValue?.categoryIds[0];

  // Related collections are the siblings of this one, which is why a collection without a
  // category simply has none: inventing a "related" list from unrelated content would be worse
  // than showing none (design spec 9.3).
  const related = useAsyncValue(
    `provider:collections:${providerId}:${categoryId ?? ''}:1`,
    ({ signal, fresh }) =>
      categoryId === undefined
        ? Promise.resolve(EMPTY_PAGE)
        : queries.collections(providerId, categoryId, { page: 1 }, { signal, fresh }),
  );

  const category =
    categories.state.status === 'ready' && categoryId !== undefined
      ? categories.state.value.find((entry) => entry.id === categoryId)
      : undefined;

  const title = collectionValue?.title ?? 'Collection';
  const itemCount = formatItemCount(collectionValue?.itemCount);
  const relatedCollections =
    related.state.status === 'ready'
      ? related.state.value.items
          .filter((entry) => entry.id !== collectionId)
          .slice(0, RELATED_LIMIT)
      : [];

  const contentTypeOptions = [
    { value: '', label: 'All types' },
    ...getDeclaredContentTypes(runtime, providerId).map((type) => ({
      value: type,
      label: CONTENT_TYPE_LABELS[type],
    })),
  ];

  const basePath = buildCollectionPath(providerId, collectionId);

  const updateParams = (changes: Readonly<Record<string, string | undefined>>) => {
    setSearchParams(nextSearchParams(searchParams, changes));
  };

  return (
    <Page
      title={title}
      {...(collectionValue?.description !== undefined
        ? { intro: collectionValue.description }
        : {})}
      breadcrumbs={
        <Breadcrumbs
          items={[
            { label: 'Home', to: buildHomePath() },
            { label: providerName, to: buildProviderPath(providerId) },
            ...(category !== undefined
              ? [{ label: category.name, to: buildCategoryPath(category.id) }]
              : []),
            { label: title },
          ]}
        />
      }
      media={
        collectionValue !== undefined ? (
          <Artwork
            src={collectionValue.artworkUrl ?? collectionValue.thumbnailUrl}
            alt=""
            fallbackLabel={providerName}
            ratio="thumbnail"
            priority
          />
        ) : undefined
      }
      meta={
        <div className={styles.meta}>
          <ProviderBadge providerId={providerId} providerName={providerName} />
          {itemCount !== undefined ? <span className={styles.metaText}>{itemCount}</span> : null}
          {collectionValue?.sourceUrl !== undefined ? (
            <a
              className={styles.source}
              href={collectionValue.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on {providerName}
            </a>
          ) : null}
        </div>
      }
    >
      <Section
        title="Items"
        description="Sort, filter, or search inside this collection. Everything here links through to the provider's own copy."
      >
        <CollectionToolbar
          query={query}
          sort={sort ?? ''}
          contentType={contentType ?? ''}
          sortOptions={COLLECTION_SORT_OPTIONS}
          contentTypeOptions={contentTypeOptions}
          onSearch={(next) => {
            updateParams({ q: next });
          }}
          onSortChange={(next) => {
            updateParams({ sort: next });
          }}
          onContentTypeChange={(next) => {
            updateParams({ type: next });
          }}
        />

        <AsyncContent
          state={items.state}
          reload={items.reload}
          errorTitle="These items could not be loaded"
          missing={{
            title: 'Collection not found',
            description: `${providerName} has no collection with the identifier “${collectionId}”.`,
          }}
          loading={
            <SkeletonGroup label="Loading items">
              <div className={styles.skeletons}>
                {Array.from({ length: 6 }, (_, index) => (
                  <SkeletonCard key={index} />
                ))}
              </div>
            </SkeletonGroup>
          }
        >
          {(result) =>
            result.items.length === 0 ? (
              <EmptyState
                title={hasFilters ? 'No items match these filters' : 'No items in this collection'}
                description={
                  hasFilters
                    ? 'Try a different search term, sort order, or content type.'
                    : `${providerName} did not report any items for this collection right now.`
                }
                {...(hasFilters
                  ? {
                      action: (
                        <Link className={styles.clear} to={basePath}>
                          Clear search and filters
                        </Link>
                      ),
                    }
                  : {})}
              />
            ) : (
              <>
                <ResponsiveGrid label="Collection items">
                  {result.items.map((item) => (
                    // Favourite controls stay absent until favourite state exists (Phase 8);
                    // rendering a button that cannot save anything would be fake functionality.
                    <ItemCard
                      key={item.id}
                      item={item}
                      providerName={getProviderName(item.providerId)}
                    />
                  ))}
                </ResponsiveGrid>

                <Pagination
                  page={result.page}
                  hasMore={result.hasMore}
                  label="Item pages"
                  buildHref={(target) =>
                    withSearchParams(
                      basePath,
                      nextSearchParams(searchParams, { page: String(target) }),
                    )
                  }
                />
              </>
            )
          }
        </AsyncContent>
      </Section>

      {relatedCollections.length > 0 ? (
        <Section
          title={category !== undefined ? `More in ${category.name}` : 'Related collections'}
          description="Other collections from the same category."
        >
          <ResponsiveGrid label="Related collections">
            {relatedCollections.map((entry) => (
              <CollectionCard
                key={entry.id}
                collection={entry}
                providerName={getProviderName(entry.providerId)}
              />
            ))}
          </ResponsiveGrid>
        </Section>
      ) : null}
    </Page>
  );
}
