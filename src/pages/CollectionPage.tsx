import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AsyncContent } from '../components/content/AsyncContent';
import { Breadcrumbs } from '../components/content/Breadcrumbs';
import { CollectionShelf } from '../components/content/CollectionShelf';
import { CollectionToolbar } from '../components/content/CollectionToolbar';
import { Section } from '../components/content/Section';
import { ShowMore } from '../components/content/ShowMore';
import { EmptyState } from '../components/feedback/EmptyState';
import { ErrorState } from '../components/feedback/ErrorState';
import { Page } from '../components/layout/Page';
import { Artwork } from '../components/ui/Artwork';
import { CollectionCard } from '../components/ui/CollectionCard';
import { ContentRow, ContentTrack } from '../components/ui/ContentRow';
import { CONTENT_TYPE_LABELS, ItemCard } from '../components/ui/ItemCard';
import { ProviderBadge } from '../components/ui/ProviderBadge';
import { SkeletonCard, SkeletonGroup } from '../components/ui/Skeleton';
import { getProviderName } from '../config/providers';
import { getDeclaredContentTypes, providerSupports } from '../data/providerCapabilities';
import { useProviderServices } from '../data/ProviderServices';
import { useAsyncValue } from '../data/useAsyncValue';
import { progressiveState, useProgressiveList } from '../data/useProgressiveList';
import type { ContentCollection } from '../models/content';
import { createPaginatedResult } from '../models/pagination';
import {
  COLLECTION_SORT_OPTIONS,
  nextSearchParams,
  parseContentTypeParam,
  parseSortParam,
} from '../utils/contentParams';
import { formatItemCount } from '../utils/format';
import {
  buildCategoryPath,
  buildCollectionPath,
  buildHomePath,
  buildProviderPath,
} from '../utils/links';
import styles from './CollectionPage.module.css';

/** Items added per "View more": one full shelf of posters. */
const ITEM_BATCH_SIZE = 24;

/** Nested collection shelves added per "View more". */
const SUBCOLLECTION_BATCH_SIZE = 6;

/** Sibling collections added per "View more". */
const RELATED_BATCH_SIZE = 12;

/** Placeholder cards while the first page of items resolves. */
const ITEM_SKELETON_COUNT = 6;

const EMPTY_COLLECTIONS = createPaginatedResult<ContentCollection>([], {
  page: 1,
  pageSize: SUBCOLLECTION_BATCH_SIZE,
});

export function CollectionPage() {
  const { providerId = '', collectionId = '' } = useParams<{
    providerId: string;
    collectionId: string;
  }>();
  const { queries, runtime } = useProviderServices();
  const [searchParams, setSearchParams] = useSearchParams();

  const providerName = getProviderName(providerId);
  const sort = parseSortParam(searchParams.get('sort'));
  const contentType = parseContentTypeParam(searchParams.get('type'));
  const query = searchParams.get('q')?.trim() ?? '';
  const hasFilters = query !== '' || contentType !== undefined;

  const collection = useAsyncValue(
    `collection:${providerId}:${collectionId}`,
    ({ signal, fresh }) => queries.collection(providerId, collectionId, { signal, fresh }),
  );

  // The Archive nests collections, and this is the layer the interface was missing: a collection
  // may hold further collections before any items. Providers with a flat hierarchy simply do not
  // advertise the capability, so no request is made and no section appears.
  const supportsSubcollections = providerSupports(runtime, providerId, 'subcollections');

  const subcollections = useProgressiveList(
    `subcollections:${providerId}:${collectionId}`,
    (page, context) =>
      supportsSubcollections
        ? queries.subcollections(
            providerId,
            collectionId,
            { page, pageSize: SUBCOLLECTION_BATCH_SIZE },
            context,
          )
        : Promise.resolve(EMPTY_COLLECTIONS),
    { getKey: (entry) => entry.id },
  );

  // Items are a growing list rather than a page of a numbered series: the reader who wants more
  // asks for more, and the URL keeps only the narrowing controls that produce a different list.
  const items = useProgressiveList(
    `collection-items:${providerId}:${collectionId}:${sort ?? ''}:${contentType ?? ''}:${query}`,
    (page, context) =>
      queries.collectionItems(
        providerId,
        collectionId,
        {
          page,
          pageSize: ITEM_BATCH_SIZE,
          ...(sort !== undefined ? { sort } : {}),
          ...(contentType !== undefined ? { contentTypes: [contentType] } : {}),
          ...(query !== '' ? { query } : {}),
        },
        context,
      ),
    { getKey: (entry) => `${entry.providerId}:${entry.id}` },
  );

  const categories = useAsyncValue(`provider:categories:${providerId}`, ({ signal, fresh }) =>
    queries.categories(providerId, { signal, fresh }),
  );

  const collectionValue = collection.state.status === 'ready' ? collection.state.value : undefined;
  const categoryId = collectionValue?.categoryIds[0];

  // Related collections are this collection's siblings inside its category. A collection with no
  // category has none: inventing a "related" list from unrelated content would be worse than
  // showing nothing (design spec 9.3).
  const related = useProgressiveList(
    `related-collections:${providerId}:${categoryId ?? ''}`,
    (page, context) =>
      categoryId === undefined
        ? Promise.resolve(EMPTY_COLLECTIONS)
        : queries.collections(
            providerId,
            categoryId,
            { page, pageSize: RELATED_BATCH_SIZE },
            context,
          ),
    { getKey: (entry) => entry.id },
  );

  const category =
    categories.state.status === 'ready' && categoryId !== undefined
      ? categories.state.value.find((entry) => entry.id === categoryId)
      : undefined;

  const title = collectionValue?.title ?? 'Collection';
  const itemCount = formatItemCount(collectionValue?.itemCount);
  const relatedCollections = related.items.filter((entry) => entry.id !== collectionId);
  const nestedCollections = subcollections.items;

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
      {nestedCollections.length > 0 ? (
        <Section
          title="Collections inside"
          description="Each nested collection is a row of its items. Open one to browse everything it holds."
        >
          {nestedCollections.map((entry) => (
            <CollectionShelf key={entry.id} collection={entry} />
          ))}

          <ShowMore
            shown={nestedCollections.length}
            total={subcollections.total}
            noun="collections"
            scope="nested collections"
            hasMore={subcollections.hasMore}
            loading={subcollections.loadingMore}
            error={subcollections.moreError}
            onLoadMore={subcollections.loadMore}
          />
        </Section>
      ) : subcollections.status === 'error' ? (
        <Section title="Collections inside">
          <ErrorState
            error={subcollections.error ?? 'The nested collections could not be loaded.'}
            title="Nested collections could not be loaded"
            onRetry={subcollections.reload}
          />
        </Section>
      ) : null}

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
          state={progressiveState(items)}
          reload={items.reload}
          errorTitle="These items could not be loaded"
          missing={{
            title: 'Collection not found',
            description: `${providerName} has no collection with the identifier “${collectionId}”.`,
          }}
          loading={
            <SkeletonGroup label="Loading items">
              <div className={styles.skeletonTrack}>
                {Array.from({ length: ITEM_SKELETON_COUNT }, (_, index) => (
                  <SkeletonCard key={index} />
                ))}
              </div>
            </SkeletonGroup>
          }
        >
          {(entries) =>
            entries.length === 0 ? (
              <EmptyState
                title={hasFilters ? 'No items match these filters' : 'No items in this collection'}
                description={
                  hasFilters
                    ? 'Try a different search term, sort order, or content type.'
                    : `${providerName} did not report any items here. It may hold only nested collections.`
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
                <ContentTrack
                  label="Collection items"
                  scrollName="Items"
                  itemCount={entries.length}
                >
                  {entries.map((item) => (
                    // Favourite controls stay absent until favourite state exists (Phase 8);
                    // rendering a button that cannot save anything would be fake functionality.
                    <ItemCard
                      key={`${item.providerId}:${item.id}`}
                      item={item}
                      providerName={getProviderName(item.providerId)}
                    />
                  ))}
                </ContentTrack>

                <ShowMore
                  shown={entries.length}
                  total={items.total}
                  noun="items"
                  scope="items"
                  hasMore={items.hasMore}
                  loading={items.loadingMore}
                  error={items.moreError}
                  onLoadMore={items.loadMore}
                />
              </>
            )
          }
        </AsyncContent>
      </Section>

      {relatedCollections.length > 0 ? (
        <>
          <ContentRow
            title={category !== undefined ? `More in ${category.name}` : 'Related collections'}
            description="Other collections from the same category."
            itemCount={relatedCollections.length}
          >
            {relatedCollections.map((entry) => (
              <CollectionCard
                key={entry.id}
                collection={entry}
                providerName={getProviderName(entry.providerId)}
              />
            ))}
          </ContentRow>

          <ShowMore
            shown={relatedCollections.length}
            total={related.total}
            noun="collections"
            scope="related collections"
            hasMore={related.hasMore}
            loading={related.loadingMore}
            error={related.moreError}
            onLoadMore={related.loadMore}
          />
        </>
      ) : null}
    </Page>
  );
}
