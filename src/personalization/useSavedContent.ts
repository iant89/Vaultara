import { useCallback, useMemo } from 'react';
import { useSession } from '../data/SessionContext';
import { formatCanonicalId, type ContentIdentity } from '../models/identity';
import { indexContentStates } from './discoveryFilter';

export function useSavedContent() {
  const session = useSession();
  const index = useMemo(() => indexContentStates(session.contentStates), [session.contentStates]);
  const signedIn = session.status === 'signed-in';

  const isFavorite = useCallback(
    (identity: ContentIdentity) => index.get(formatCanonicalId(identity))?.favorited === true,
    [index],
  );

  const isLiked = useCallback(
    (identity: ContentIdentity) => index.get(formatCanonicalId(identity))?.liked === true,
    [index],
  );

  return {
    signedIn,
    isFavorite,
    isLiked,
    toggleFavorite: session.toggleFavorite,
    toggleLike: session.toggleLike,
  };
}
