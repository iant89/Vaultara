import type { ContentItem } from '../../models/content';
import { snapshotFromItem } from '../../personalization/savedContent';
import { useSavedContent } from '../../personalization/useSavedContent';
import { ItemCard } from '../ui/ItemCard';

interface SavedItemCardProps {
  readonly item: ContentItem;
  readonly providerName: string;
  readonly showProvider?: boolean;
  readonly resumeHref?: string;
  readonly unavailable?: boolean;
}

/** Item card wired to the signed-in favorite store. Unsigned visitors see no dead control. */
export function SavedItemCard({
  item,
  providerName,
  showProvider = false,
  resumeHref,
  unavailable = false,
}: SavedItemCardProps) {
  const saved = useSavedContent();
  const identity = { providerId: item.providerId, itemId: item.id };

  return (
    <ItemCard
      item={item}
      providerName={providerName}
      showProvider={showProvider}
      {...(resumeHref !== undefined ? { resumeHref } : {})}
      {...(unavailable
        ? { notice: 'This provider could not be reached. Showing the saved title.' }
        : {})}
      {...(saved.signedIn
        ? {
            isFavorite: saved.isFavorite(identity),
            onFavoriteToggle: (_ignored, next: boolean) => {
              void saved.toggleFavorite(identity, next, snapshotFromItem(item)).catch(() => {
                // Card surfaces already roll the star back; details pages report the error.
              });
            },
          }
        : {})}
    />
  );
}
