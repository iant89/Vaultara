import type { ContentCollection } from '../../models/content';
import { snapshotFromCollection } from '../../personalization/savedContent';
import { useSavedContent } from '../../personalization/useSavedContent';
import { CollectionCard } from '../ui/CollectionCard';

interface SavedCollectionCardProps {
  readonly collection: ContentCollection;
  readonly providerName: string;
  readonly wide?: boolean;
  readonly priority?: boolean;
  readonly showProvider?: boolean;
}

export function SavedCollectionCard({
  collection,
  providerName,
  wide,
  priority,
  showProvider,
}: SavedCollectionCardProps) {
  const saved = useSavedContent();
  const identity = { providerId: collection.providerId, itemId: collection.id };

  return (
    <CollectionCard
      collection={collection}
      providerName={providerName}
      {...(wide !== undefined ? { wide } : {})}
      {...(priority !== undefined ? { priority } : {})}
      {...(showProvider !== undefined ? { showProvider } : {})}
      {...(saved.signedIn
        ? {
            isFavorite: saved.isFavorite(identity),
            onFavoriteToggle: (_ignored: typeof identity, next: boolean) => {
              void saved
                .toggleFavorite(identity, next, snapshotFromCollection(collection))
                .catch(() => {
                  // The star rolls back from session state; the details page reports write errors.
                });
            },
          }
        : {})}
    />
  );
}
