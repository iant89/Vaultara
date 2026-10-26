import { useState } from 'react';
import { Link } from 'react-router-dom';
import { describeSessionError } from '../../data/SessionContext';
import type { ContentItem } from '../../models/content';
import { snapshotFromItem } from '../../personalization/savedContent';
import { useSavedContent } from '../../personalization/useSavedContent';
import { buildSettingsPath } from '../../utils/links';
import { FavoriteButton, LikeButton } from '../ui/ToggleButton';
import styles from './SavedActions.module.css';

interface SavedActionsProps {
  readonly item: ContentItem;
}

/** Favorite and like controls for a details or viewer header. */
export function SavedActions({ item }: SavedActionsProps) {
  const saved = useSavedContent();
  const [error, setError] = useState<string | undefined>();
  const identity = { providerId: item.providerId, itemId: item.id };
  const snapshot = snapshotFromItem(item);

  if (!saved.signedIn) {
    return (
      <p className={styles.signIn}>
        <Link to={buildSettingsPath()}>Sign in</Link> to save favorites and likes on this device.
      </p>
    );
  }

  async function run(action: () => Promise<void>) {
    setError(undefined);

    try {
      await action();
    } catch (cause) {
      setError(describeSessionError(cause).message);
    }
  }

  return (
    <div className={styles.actions}>
      <FavoriteButton
        active={saved.isFavorite(identity)}
        itemTitle={item.title}
        onToggle={(next) => {
          void run(() => saved.toggleFavorite(identity, next, snapshot));
        }}
      />
      <LikeButton
        active={saved.isLiked(identity)}
        itemTitle={item.title}
        onToggle={(next) => {
          void run(() => saved.toggleLike(identity, next, snapshot));
        }}
      />
      {error !== undefined ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
