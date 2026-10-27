import { Link, useSearchParams } from 'react-router-dom';
import { CollectionToolbar } from '../components/content/CollectionToolbar';
import { SavedItemCard } from '../components/content/SavedItemCard';
import { EmptyState } from '../components/feedback/EmptyState';
import { LoadingState } from '../components/feedback/LoadingState';
import { Page } from '../components/layout/Page';
import { CONTENT_TYPE_LABELS } from '../components/ui/ItemCard';
import { ResponsiveGrid } from '../components/ui/ResponsiveGrid';
import { getProviderName } from '../config/providers';
import { useProviderServices } from '../data/ProviderServices';
import { useSession } from '../data/SessionContext';
import { useAsyncValue } from '../data/useAsyncValue';
import type { ContentItem } from '../models/content';
import { formatCanonicalId } from '../models/identity';
import type { StoredContentState } from '../persistence/contract';
import { filterHiddenAdultRecords } from '../personalization/adultAccess';
import {
  FAVORITE_SORT_OPTIONS,
  favoriteType,
  listFavorites,
  parseFavoriteSortParam,
} from '../personalization/favoriteList';
import { isFavoriteRecord } from '../personalization/savedContent';
import { parseContentTypeParam, nextSearchParams } from '../utils/contentParams';
import { buildFavoritesPath, buildSettingsPath, buildViewerPath } from '../utils/links';
import styles from './FavoritesPage.module.css';

export function FavoritesPage() {
  const session = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q')?.trim() ?? '';
  const sort = parseFavoriteSortParam(searchParams.get('sort'));
  const contentType = parseContentTypeParam(searchParams.get('type'));
  const providerFilter = searchParams.get('provider')?.trim() || undefined;

  if (session.status === 'loading') {
    return (
      <Page title="Favorites">
        <LoadingState label="Loading favorites…" />
      </Page>
    );
  }

  if (session.status === 'signed-out') {
    return (
      <Page
        title="Favorites"
        intro="One global favorites list shared by every provider. Likes are separate and only influence recommendations."
      >
        <EmptyState
          title="Sign in to save favorites"
          description="Favorites stay in this browser. They do not sync across devices."
          action={<Link to={buildSettingsPath()}>Go to Settings</Link>}
        />
      </Page>
    );
  }

  const saved = filterHiddenAdultRecords(
    session.contentStates.filter(isFavoriteRecord),
    session.preferences,
  );
  const hiddenAdultOnly =
    saved.length === 0 && session.contentStates.filter(isFavoriteRecord).length > 0;
  const listed = listFavorites(saved, {
    query,
    sort,
    ...(contentType !== undefined ? { contentType } : {}),
    ...(providerFilter !== undefined ? { providerId: providerFilter } : {}),
  });

  const providerOptions = uniqueOptions(
    saved.map((state) => state.providerId),
    (id) => getProviderName(id),
    'All providers',
  );
  const typeOptions = uniqueOptions(
    saved.map((state) => favoriteType(state)),
    (type) => CONTENT_TYPE_LABELS[type],
    'All types',
  );

  function updateParams(changes: Readonly<Record<string, string | undefined>>) {
    setSearchParams(nextSearchParams(searchParams, changes));
  }

  return (
    <Page
      title="Favorites"
      intro="One global favorites list shared by every provider. Likes are separate and only influence recommendations."
    >
      {saved.length === 0 ? (
        <EmptyState
          title={hiddenAdultOnly ? 'Adult favorites are hidden' : 'Nothing saved yet'}
          description={
            hiddenAdultOnly
              ? 'Adult items stay saved on this device. Turn off hiding under Content visibility to show them here.'
              : 'Save an item from discovery, a collection, or its details page. A like does not add it here.'
          }
          action={
            hiddenAdultOnly ? (
              <Link to={buildSettingsPath('content')}>Open content visibility</Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <CollectionToolbar
            query={query}
            sort={sort}
            contentType={contentType ?? ''}
            sortOptions={FAVORITE_SORT_OPTIONS}
            contentTypeOptions={typeOptions}
            searchLabel="Search favorites"
            provider={providerFilter ?? ''}
            providerOptions={providerOptions}
            onSearch={(next) => {
              updateParams({ q: next });
            }}
            onSortChange={(next) => {
              updateParams({ sort: next === 'favorited-desc' ? undefined : next });
            }}
            onContentTypeChange={(next) => {
              updateParams({ type: next });
            }}
            onProviderChange={(next) => {
              updateParams({ provider: next });
            }}
          />

          {listed.length === 0 ? (
            <EmptyState
              title="No favorites match these filters"
              description="Try a different search, provider, or content type."
              action={
                <Link className={styles.clear} to={buildFavoritesPath()}>
                  Clear search and filters
                </Link>
              }
            />
          ) : (
            <ResponsiveGrid label="Favorites">
              {listed.map((state) => (
                <FavoriteCard key={formatCanonicalId(state)} state={state} />
              ))}
            </ResponsiveGrid>
          )}
        </>
      )}
    </Page>
  );
}

function FavoriteCard({ state }: { readonly state: StoredContentState }) {
  const { queries } = useProviderServices();
  const item = useAsyncValue(`item:${state.providerId}:${state.itemId}`, ({ signal, fresh }) =>
    queries.item(state.providerId, state.itemId, { signal, fresh }),
  );
  const fallback: ContentItem = {
    id: state.itemId,
    providerId: state.providerId,
    title: state.snapshot?.title ?? state.itemId,
    type: state.snapshot?.type ?? 'unknown',
    categories: [],
    tags: [],
    metadata: {},
    ...(state.snapshot?.thumbnailUrl !== undefined
      ? { thumbnailUrl: state.snapshot.thumbnailUrl }
      : {}),
  };
  const display = item.state.status === 'ready' ? item.state.value : fallback;
  const resumeHref =
    state.progress?.kind === 'pdf' || state.progress?.kind === 'book'
      ? buildViewerPath(state)
      : undefined;

  return (
    <SavedItemCard
      item={display}
      providerName={getProviderName(state.providerId)}
      showProvider
      unavailable={item.state.status === 'error'}
      {...(resumeHref !== undefined ? { resumeHref } : {})}
    />
  );
}

function uniqueOptions<T extends string>(
  values: readonly T[],
  label: (value: T) => string,
  allLabel: string,
): readonly { value: string; label: string }[] {
  const unique = [...new Set(values)].sort((left, right) =>
    label(left).localeCompare(label(right)),
  );

  return [
    { value: '', label: allLabel },
    ...unique.map((value) => ({ value, label: label(value) })),
  ];
}
