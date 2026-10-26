import { useId } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { ContentItem } from '../../models/content';
import { formatCanonicalId } from '../../models/identity';
import { snapshotFromItem } from '../../personalization/savedContent';
import { useSavedContent } from '../../personalization/useSavedContent';
import { buildDiscoverablePath } from '../../utils/links';
import { Artwork } from '../ui/Artwork';
import { CONTENT_TYPE_LABELS } from '../ui/ItemCard';
import { FavoriteButton } from '../ui/ToggleButton';
import styles from './FeaturedItem.module.css';

interface FeaturedItemProps {
  readonly item: ContentItem;
  readonly label?: string;
  /** Rendered beside the heading, e.g. a provider badge. */
  readonly badge?: ReactNode;
}

function describe(item: ContentItem): string {
  const type = CONTENT_TYPE_LABELS[item.type];

  return [type, item.creator, item.publicationDate]
    .filter((part): part is string => part !== undefined && part.length > 0)
    .join(' · ');
}

/**
 * The promoted item at the top of discovery (design spec 5.1).
 *
 * One heading link rather than a heading plus a call-to-action button: there is one destination,
 * and two controls pointing at it would add a tab stop without adding a choice.
 */
export function FeaturedItem({ item, label = 'Featured', badge }: FeaturedItemProps) {
  const headingId = useId();
  const identity = { providerId: item.providerId, itemId: item.id };
  const summary = describe(item);
  const saved = useSavedContent();

  return (
    <article
      className={styles.featured}
      aria-labelledby={headingId}
      data-canonical-id={formatCanonicalId(identity)}
    >
      <div className={styles.media}>
        <Artwork
          src={item.thumbnailUrl ?? item.artworkUrl}
          alt=""
          fallbackLabel={CONTENT_TYPE_LABELS[item.type]}
          ratio="thumbnail"
          priority
        />
        {saved.signedIn ? (
          <FavoriteButton
            active={saved.isFavorite(identity)}
            itemTitle={item.title}
            className={styles.toggle}
            onToggle={(next) => {
              void saved.toggleFavorite(identity, next, snapshotFromItem(item)).catch(() => {
                // The star rolls back from session state; the details page reports write errors.
              });
            }}
          />
        ) : null}
      </div>

      <div className={styles.body}>
        <p className={styles.eyebrow}>{label}</p>
        <h2 id={headingId} className={styles.title}>
          <Link to={buildDiscoverablePath(item)} className={styles.titleLink}>
            {item.title}
          </Link>
        </h2>
        {item.description ? <p className={styles.description}>{item.description}</p> : null}
        <div className={styles.meta}>
          {summary.length > 0 ? <span className={styles.metaText}>{summary}</span> : null}
          {badge}
        </div>
      </div>
    </article>
  );
}
