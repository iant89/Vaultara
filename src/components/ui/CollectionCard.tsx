import { Link } from 'react-router-dom';
import type { ContentCollection } from '../../models/content';
import { buildCollectionPath } from '../../utils/links';
import { Artwork } from './Artwork';
import { ProviderBadge } from './ProviderBadge';
import styles from './ContentCard.module.css';

interface CollectionCardProps {
  readonly collection: ContentCollection;
  readonly providerName: string;
  /** Uses the wider 16:9 crop used for featured collections. */
  readonly wide?: boolean;
  readonly priority?: boolean;
}

function formatItemCount(count: number | undefined): string | null {
  if (count === undefined || !Number.isFinite(count) || count < 1) {
    return null;
  }

  return `${count.toLocaleString('en-US')} ${count === 1 ? 'item' : 'items'}`;
}

/**
 * A provider collection in a row or grid.
 *
 * Opening a collection never marks its items as explored; exploration is item-level only
 * (design spec 7.1), which is why this card records nothing on interaction.
 */
export function CollectionCard({
  collection,
  providerName,
  wide = false,
  priority = false,
}: CollectionCardProps) {
  const itemCount = formatItemCount(collection.itemCount);

  return (
    <li className={styles.card}>
      <div className={styles.artworkWrap}>
        <Artwork
          src={collection.artworkUrl ?? collection.thumbnailUrl}
          alt=""
          fallbackLabel={providerName}
          ratio={wide ? 'thumbnail' : 'poster'}
          priority={priority}
          className={styles.artwork}
        />
      </div>

      <div className={styles.body}>
        <h3 className={styles.title}>
          <Link
            to={buildCollectionPath(collection.providerId, collection.id)}
            className={styles.titleLink}
          >
            {collection.title}
          </Link>
        </h3>

        {collection.description ? (
          <p className={styles.description}>{collection.description}</p>
        ) : null}
      </div>

      <div className={styles.footer}>
        <ProviderBadge providerId={collection.providerId} providerName={providerName} compact />
        {itemCount ? <span className={styles.typeChip}>{itemCount}</span> : null}
      </div>
    </li>
  );
}
