import { Link } from 'react-router-dom';
import type { ContentItem } from '../../models/content';
import { formatCanonicalId } from '../../models/identity';
import type { ContentIdentity } from '../../models/identity';
import { buildDiscoverablePath } from '../../utils/links';
import { Artwork } from './Artwork';
import { ProviderBadge } from './ProviderBadge';
import { FavoriteButton } from './ToggleButton';
import styles from './ContentCard.module.css';

/** Human-readable label for a content type, used in chips and card descriptions. */
export const CONTENT_TYPE_LABELS: Readonly<Record<ContentItem['type'], string>> = {
  book: 'Book',
  document: 'Document',
  article: 'Article',
  movie: 'Film',
  video: 'Video',
  audio: 'Audio',
  music: 'Music',
  image: 'Image',
  game: 'Game',
  software: 'Software',
  website: 'Website',
  collection: 'Collection',
  archive: 'Archive',
  unknown: 'Other',
};

interface ItemCardProps {
  readonly item: ContentItem;
  readonly providerName: string;
  /** Omit to hide the favourite control, e.g. where favourites are not supported. */
  readonly onFavoriteToggle?: (identity: ContentIdentity, next: boolean) => void;
  readonly isFavorite?: boolean;
  readonly favoriteDisabled?: boolean;
  /** Renders the provider badge; hide it when the whole surface is already one provider. */
  readonly showProvider?: boolean;
}

/**
 * A single content item in a grid or row.
 *
 * Canonical identity (`providerId:itemId`) builds the link, so identical item ids from
 * different providers stay distinct (design spec 9.5).
 */
export function ItemCard({
  item,
  providerName,
  onFavoriteToggle,
  isFavorite = false,
  favoriteDisabled = false,
  showProvider = false,
}: ItemCardProps) {
  const identity: ContentIdentity = { providerId: item.providerId, itemId: item.id };
  const typeLabel = CONTENT_TYPE_LABELS[item.type];

  return (
    <li className={styles.card} data-canonical-id={formatCanonicalId(identity)}>
      <div className={styles.artworkWrap}>
        <Artwork
          src={item.thumbnailUrl}
          alt=""
          fallbackLabel={typeLabel}
          ratio="poster"
          className={styles.artwork}
        />
        {onFavoriteToggle ? (
          <FavoriteButton
            active={isFavorite}
            itemTitle={item.title}
            disabled={favoriteDisabled}
            className={styles.toggle}
            onToggle={(next) => {
              onFavoriteToggle(identity, next);
            }}
          />
        ) : null}
      </div>

      <div className={styles.body}>
        <h3 className={styles.title}>
          <Link to={buildDiscoverablePath(item)} className={styles.titleLink}>
            {item.title}
          </Link>
        </h3>

        {item.creator ? <p className={styles.description}>{item.creator}</p> : null}

        <div className={styles.metaRow}>
          <span className={styles.typeChip} data-testid="content-type">
            {typeLabel}
          </span>
          {item.publicationDate ? (
            <span className={styles.metaText}>{item.publicationDate}</span>
          ) : null}
        </div>
      </div>

      {showProvider ? (
        <div className={styles.footer}>
          <ProviderBadge providerId={item.providerId} providerName={providerName} compact />
        </div>
      ) : null}
    </li>
  );
}
