import { Navigate, useParams } from 'react-router-dom';
import { AsyncContent } from '../components/content/AsyncContent';
import { Breadcrumbs } from '../components/content/Breadcrumbs';
import { FileList } from '../components/content/FileList';
import { SavedActions } from '../components/content/SavedActions';
import { SavedItemCard } from '../components/content/SavedItemCard';
import { Section } from '../components/content/Section';
import { ShowMore } from '../components/content/ShowMore';
import { ErrorState } from '../components/feedback/ErrorState';
import { Page } from '../components/layout/Page';
import { Artwork } from '../components/ui/Artwork';
import { ContentRow } from '../components/ui/ContentRow';
import { CONTENT_TYPE_LABELS } from '../components/ui/ItemCard';
import { MetadataList } from '../components/ui/MetadataList';
import { ProviderBadge } from '../components/ui/ProviderBadge';
import { SkeletonGroup, SkeletonMedia } from '../components/ui/Skeleton';
import { getProviderName } from '../config/providers';
import { providerSupports } from '../data/providerCapabilities';
import { useProviderServices } from '../data/ProviderServices';
import { useAsyncValue } from '../data/useAsyncValue';
import { useProgressiveList } from '../data/useProgressiveList';
import type { ContentFile } from '../models/content';
import { createPaginatedResult } from '../models/pagination';
import { formatCanonicalId } from '../models/identity';
import { useMarkExplored } from '../personalization/useMarkExplored';
import { buildCollectionPath, buildHomePath, buildProviderPath } from '../utils/links';
import styles from './ItemPage.module.css';

/** Tags shown before the list stops being a summary and becomes the item's whole index. */
const MAX_TAGS = 8;

/** Related items fetched per request; the reader asks for the next batch. */
const RELATED_BATCH_SIZE = 12;

/** Split prose into paragraphs without inventing structure that is not there. */
function paragraphs(text: string | undefined): readonly string[] {
  if (text === undefined) {
    return [];
  }

  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

/** A licence value is only a link when it is a usable absolute URL. */
function isLinkable(value: string | undefined): value is string {
  return value !== undefined && /^https?:\/\//i.test(value);
}

/**
 * Readable label for a licence URL.
 *
 * Providers publish licence URLs, not licence names, and the URL itself is long enough to force a
 * line break in the middle of a word. The host and path are precise enough to identify the terms
 * while staying on one line.
 */
function summariseLicence(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, '');

    return `${parsed.host}${path}`;
  } catch {
    return url;
  }
}

export function ItemPage() {
  const { providerId = '', itemId = '' } = useParams<{ providerId: string; itemId: string }>();
  const { queries, runtime } = useProviderServices();

  const providerName = getProviderName(providerId);

  const item = useAsyncValue(`item:${providerId}:${itemId}`, ({ signal, fresh }) =>
    queries.item(providerId, itemId, { signal, fresh }),
  );

  // Files and related content only need the identity, so they start alongside the item rather
  // than after it; a provider that does not offer them resolves to nothing and no request is made.
  const files = useAsyncValue(`files:${providerId}:${itemId}`, ({ signal, fresh }) =>
    providerSupports(runtime, providerId, 'downloadableFiles')
      ? queries.files(providerId, itemId, { signal, fresh })
      : Promise.resolve<readonly ContentFile[]>([]),
  );

  const related = useProgressiveList(
    `related:${providerId}:${itemId}`,
    (page, context) =>
      providerSupports(runtime, providerId, 'relatedContent')
        ? queries.relatedItems(providerId, itemId, { page, pageSize: RELATED_BATCH_SIZE }, context)
        : Promise.resolve(createPaginatedResult([], { page, pageSize: RELATED_BATCH_SIZE })),
    { getKey: (entry) => `${entry.providerId}:${entry.id}` },
  );

  const value = item.state.status === 'ready' ? item.state.value : undefined;
  const typeLabel = value === undefined ? undefined : CONTENT_TYPE_LABELS[value.type];
  const canonicalId = formatCanonicalId({ providerId, itemId });
  const collectionId = value?.categories[0];
  useMarkExplored({ providerId, itemId }, value !== undefined, value?.type);

  // A collection opened on the item route (from a leaky related/search list, or a typed URL)
  // belongs on the collection page, where its nested collections and items can be browsed.
  if (value !== undefined && value.type === 'collection') {
    return <Navigate to={buildCollectionPath(providerId, value.id)} replace />;
  }

  return (
    <Page
      title={value?.title ?? 'Item details'}
      breadcrumbs={
        <Breadcrumbs
          items={[
            { label: 'Home', to: buildHomePath() },
            { label: providerName, to: buildProviderPath(providerId) },
            ...(collectionId !== undefined
              ? [{ label: collectionId, to: buildCollectionPath(providerId, collectionId) }]
              : []),
            { label: value?.title ?? 'Item details' },
          ]}
        />
      }
      media={
        value !== undefined ? (
          <Artwork
            src={value.thumbnailUrl ?? value.artworkUrl}
            alt=""
            fallbackLabel={typeLabel ?? providerName}
            ratio="poster"
            priority
          />
        ) : undefined
      }
      meta={
        value !== undefined ? (
          <div className={styles.meta}>
            <ProviderBadge providerId={providerId} providerName={providerName} />
            {typeLabel !== undefined ? <span className={styles.metaText}>{typeLabel}</span> : null}
            {value.creator !== undefined ? (
              <span className={styles.metaText}>{value.creator}</span>
            ) : null}
            {value.publicationDate !== undefined ? (
              <span className={styles.metaText}>{value.publicationDate}</span>
            ) : null}
            <SavedActions item={value} />
          </div>
        ) : undefined
      }
    >
      <AsyncContent
        state={item.state}
        reload={item.reload}
        errorTitle="This item could not be loaded"
        missing={{
          title: 'Item not found',
          description: `${providerName} has no item with the identifier “${itemId}”.`,
        }}
        loading={
          <SkeletonGroup label="Loading item details">
            <div className={styles.skeleton}>
              <SkeletonMedia />
            </div>
          </SkeletonGroup>
        }
      >
        {(loaded) => {
          const about = paragraphs(loaded.description);
          const licence = loaded.rights?.license;

          return (
            <>
              {about.length > 0 ? (
                <Section title="About this item">
                  <div className={styles.prose}>
                    {about.map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>
                </Section>
              ) : null}

              <Section
                title="Files"
                description={`Files are hosted by ${providerName}. Downloading opens their original copy; nothing is fetched by this app to show the listing.`}
              >
                <AsyncContent
                  state={files.state}
                  reload={files.reload}
                  errorTitle="Files could not be loaded"
                >
                  {(entries) => (
                    <FileList
                      files={entries}
                      itemTitle={loaded.title}
                      itemType={loaded.type}
                      {...(loaded.thumbnailUrl !== undefined
                        ? { artworkUrl: loaded.thumbnailUrl }
                        : {})}
                    />
                  )}
                </AsyncContent>
              </Section>

              <Section title="Details">
                <MetadataList
                  label="Item metadata"
                  entries={[
                    { label: 'Media type', value: typeLabel },
                    { label: 'Creator', value: loaded.creator },
                    { label: 'Published', value: loaded.publicationDate },
                    { label: 'Collections', value: loaded.categories.join(', ') },
                    { label: 'Subjects', value: loaded.tags.slice(0, MAX_TAGS).join(', ') },
                    { label: 'Canonical id', value: canonicalId },
                  ]}
                />
              </Section>

              <Section title="Source and rights">
                <div className={styles.prose}>
                  {loaded.sourceUrl !== undefined ? (
                    <p>
                      <a
                        className={styles.sourceLink}
                        href={loaded.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View this item on {providerName}
                      </a>
                    </p>
                  ) : (
                    <p>{providerName} did not provide a source page for this item.</p>
                  )}

                  {licence !== undefined ? (
                    <p>
                      Licence:{' '}
                      {isLinkable(licence) ? (
                        <a
                          className={styles.sourceLink}
                          href={licence}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={licence}
                        >
                          {summariseLicence(licence)}
                        </a>
                      ) : (
                        licence
                      )}
                    </p>
                  ) : null}

                  {loaded.rights?.rightsStatement !== undefined ? (
                    <p>{loaded.rights.rightsStatement}</p>
                  ) : null}

                  {loaded.rights === undefined ? (
                    <p>
                      {providerName} did not state rights or licence terms for this item. Terms set
                      by the rights holder still apply.
                    </p>
                  ) : null}
                </div>
              </Section>

              {related.error !== undefined ? (
                // Related content is a bonus, not the page's purpose: a failure here says so
                // quietly rather than turning the item into an error page.
                <Section title="Related items">
                  <ErrorState
                    error={related.error}
                    title="Related items could not be loaded"
                    onRetry={related.reload}
                  />
                </Section>
              ) : related.items.length > 0 ? (
                <>
                  <ContentRow
                    title="Related items"
                    description="Other items from the same collections."
                    itemCount={related.items.length}
                  >
                    {related.items.map((entry) => (
                      <SavedItemCard
                        key={`${entry.providerId}:${entry.id}`}
                        item={entry}
                        providerName={getProviderName(entry.providerId)}
                      />
                    ))}
                  </ContentRow>

                  <ShowMore
                    shown={related.items.length}
                    total={related.total}
                    noun="items"
                    scope="related items"
                    hasMore={related.hasMore}
                    loading={related.loadingMore}
                    error={related.moreError}
                    onLoadMore={related.loadMore}
                  />
                </>
              ) : null}
            </>
          );
        }}
      </AsyncContent>
    </Page>
  );
}
