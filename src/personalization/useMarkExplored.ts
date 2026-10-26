import { useEffect } from 'react';
import { useSession } from '../data/SessionContext';
import type { ContentIdentity } from '../models/identity';

/**
 * Records one exploration when an item's details or viewer is ready.
 *
 * Collections are excluded: opening a container must not mark its children, and a collection
 * identity itself is not an item the reader explored (design spec 7.1).
 */
export function useMarkExplored(
  identity: ContentIdentity,
  ready: boolean,
  itemType?: string,
): void {
  const { markExplored } = useSession();
  const { itemId, providerId } = identity;

  useEffect(() => {
    if (!ready || itemType === 'collection') {
      return;
    }

    void markExplored({ providerId, itemId });
  }, [itemId, itemType, markExplored, providerId, ready]);
}
