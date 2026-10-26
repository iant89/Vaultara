import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AsyncContent } from '../components/content/AsyncContent';
import { CollectionToolbar } from '../components/content/CollectionToolbar';
import { SavedItemCard } from '../components/content/SavedItemCard';
import { Section } from '../components/content/Section';
import { ShowMore } from '../components/content/ShowMore';
import { EmptyState } from '../components/feedback/EmptyState';
import { LoadingState } from '../components/feedback/LoadingState';
import { Page } from '../components/layout/Page';
import { CONTENT_TYPE_LABELS } from '../components/ui/ItemCard';
import { ResponsiveGrid } from '../components/ui/ResponsiveGrid';
import { SkeletonCard, SkeletonGroup } from '../components/ui/Skeleton';
import { DISCOVERY_ROWS, SEARCH_PAGE_SIZE } from '../config/discovery';
import { getProviderName } from '../config/providers';
import { useProviderServices } from '../data/ProviderServices';
import { useSession } from '../data/SessionContext';
import { progressiveState, useProgressiveList } from '../data/useProgressiveList';
import { formatCanonicalId } from '../models/identity';
import { recordRecentSearch, readRecentSearches } from '../personalization/recentSearches';
import {
  contentTypesForSearch,
  declaredSearchTypes,
  listSearchableProviders,
  parseSearchCategoryParam,
} from '../personalization/searchProviders';
import {
  nextSearchParams,
  parseContentTypeParam,
  parseSearchSortParam,
  SEARCH_SORT_OPTIONS,
} from '../utils/contentParams';
import { buildSearchPath } from '../utils/links';
import styles from './SearchPage.module.css';

const SKELETON_COUNT = 6;

export function SearchPage() {
  const session = useSession();
  const { runtime } = useProviderServices();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q')?.trim() ?? '';
  const sort = parseSearchSortParam(searchParams.get('sort'));
  const contentType = parseContentTypeParam(searchParams.get('type'));
  const categoryId = parseSearchCategoryParam(searchParams.get('category'));
  const providerFilter = searchParams.get('provider')?.trim() || undefined;

  const searchable = listSearchableProviders(runtime, session.preferences.disabledProviderIds);
  const providers =
    providerFilter === undefined
      ? searchable
      : searchable.filter((provider) => provider.id === providerFilter);
  const contentTypes = contentTypesForSearch({
    ...(contentType !== undefined ? { type: contentType } : {}),
    ...(categoryId !== undefined ? { categoryId } : {}),
  });
  const typeOptions = [
    { value: '', label: 'All types' },
    ...declaredSearchTypes(runtime, searchable).map((type) => ({
      value: type,
      label: CONTENT_TYPE_LABELS[type],
    })),
  ];
  const categoryOptions = [
    { value: '', label: 'All categories' },
    ...DISCOVERY_ROWS.map((row) => ({ value: row.categoryId, label: row.title })),
  ];
  const providerOptions = [
    { value: '', label: 'All providers' },
    ...searchable.map((provider) => ({ value: provider.id, label: provider.name })),
  ];
  const recents = query === '' ? readRecentSearches() : [];

  useEffect(() => {
    if (query.length > 0) {
      recordRecentSearch(query);
    }
  }, [query]);

  function updateParams(changes: Readonly<Record<string, string | undefined>>) {
    setSearchParams(nextSearchParams(searchParams, changes));
  }

  return (
    <Page
      title="Search"
      intro="One query across every enabled provider, with results grouped by source and partial failures reported without discarding successful results."
    >
      <CollectionToolbar
        query={query}
        sort={sort}
        contentType={contentType ?? ''}
        sortOptions={SEARCH_SORT_OPTIONS}
        contentTypeOptions={typeOptions}
        searchLabel="Find titles"
        provider={providerFilter ?? ''}
        providerOptions={providerOptions}
        category={categoryId ?? ''}
        categoryOptions={categoryOptions}
        onSearch={(next) => {
          updateParams({ q: next });
        }}
        onSortChange={(next) => {
          updateParams({ sort: next === 'relevance' ? undefined : next });
        }}
        onContentTypeChange={(next) => {
          updateParams({ type: next });
        }}
        onProviderChange={(next) => {
          updateParams({ provider: next });
        }}
        onCategoryChange={(next) => {
          updateParams({ category: next });
        }}
      />

      {query === '' ? (
        <>
          <EmptyState
            title="Search every enabled provider"
            description="Type a title, creator, or subject. Explored and favorited items stay in these results. Requests fire when you submit, not on every keystroke."
          />
          {recents.length > 0 ? (
            <Section title="Recent searches">
              <ul className={styles.recents} aria-label="Recent searches">
                {recents.map((entry) => (
                  <li key={entry}>
                    <Link className={styles.recentLink} to={buildSearchPath(entry)}>
                      {entry}
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </>
      ) : session.status === 'loading' ? (
        <LoadingState label="Loading search…" />
      ) : searchable.length === 0 ? (
        <EmptyState
          title="No enabled providers can search"
          description="Turn a provider back on in Settings, or wait until a planned provider ships an adapter."
        />
      ) : providers.length === 0 ? (
        <EmptyState
          title="That provider is not available for search"
          description="It may be disabled, planned, or missing a search adapter."
          action={
            <Link className={styles.clear} to={buildSearchPath(query)}>
              Search all enabled providers
            </Link>
          }
        />
      ) : (
        providers.map((provider) => (
          <ProviderSearchSection
            key={provider.id}
            providerId={provider.id}
            query={query}
            sort={sort}
            contentTypes={contentTypes}
          />
        ))
      )}
    </Page>
  );
}

function ProviderSearchSection({
  providerId,
  query,
  sort,
  contentTypes,
}: {
  readonly providerId: string;
  readonly query: string;
  readonly sort: ReturnType<typeof parseSearchSortParam>;
  readonly contentTypes: ReturnType<typeof contentTypesForSearch>;
}) {
  const { queries } = useProviderServices();
  const providerName = getProviderName(providerId);
  const list = useProgressiveList(
    `search:${providerId}:${query}:${sort}:${contentTypes?.join(',') ?? ''}`,
    (page, context) =>
      queries.search(
        providerId,
        query,
        {
          page,
          pageSize: SEARCH_PAGE_SIZE,
          sort,
          ...(contentTypes !== undefined ? { contentTypes } : {}),
        },
        context,
      ),
    { getKey: (item) => formatCanonicalId({ providerId: item.providerId, itemId: item.id }) },
  );

  return (
    <Section title={providerName} description={`Results from ${providerName}.`}>
      <AsyncContent
        state={progressiveState(list)}
        reload={list.reload}
        errorTitle={`${providerName} could not be searched`}
        loading={
          <SkeletonGroup label={`Loading ${providerName} results`}>
            <div className={styles.skeletonGrid}>
              {Array.from({ length: SKELETON_COUNT }, (_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          </SkeletonGroup>
        }
      >
        {(items) =>
          items.length === 0 ? (
            <EmptyState
              title={`No results from ${providerName}`}
              description="Try a different query, category, or content type. Other providers are unaffected."
            />
          ) : (
            <>
              <ResponsiveGrid label={`${providerName} results`}>
                {items.map((item) => (
                  <SavedItemCard
                    key={formatCanonicalId({ providerId: item.providerId, itemId: item.id })}
                    item={item}
                    providerName={providerName}
                    showProvider
                  />
                ))}
              </ResponsiveGrid>
              <ShowMore
                shown={items.length}
                total={list.total}
                noun="results"
                scope={`${providerName} results`}
                hasMore={list.hasMore}
                loading={list.loadingMore}
                error={list.moreError}
                onLoadMore={list.loadMore}
              />
            </>
          )
        }
      </AsyncContent>
    </Section>
  );
}
