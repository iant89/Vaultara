import { Link } from 'react-router-dom';
import type { ContentCollection } from '../../models/content';
import { formatItemCount } from '../../utils/format';
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
  /** Renders the provider badge; hide it when the whole surface is already one provider. */
  readonly showProvider?: boolean;
}

/**
 * A provider collection in a row or grid.
 *
 * Artwork dominates (design spec 5.3): the title and an item count are enough to identify the
 * collection, and the long description belongs on its page. Opening a collection never marks its
 * items as explored; exploration is item-level only (design spec 7.1).
 */
export function CollectionCard({
  collection,
  providerName,
  wide = false,
  priority = false,
  showProvider = false,
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
      </div>

      {showProvider || itemCount !== undefined ? (
        <div className={styles.footer}>
          {showProvider ? (
            <ProviderBadge providerId={collection.providerId} providerName={providerName} compact />
          ) : null}
          {itemCount !== undefined ? <span className={styles.typeChip}>{itemCount}</span> : null}
        </div>
      ) : null}
    </li>
  );
}
