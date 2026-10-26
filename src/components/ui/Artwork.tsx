import { useState } from 'react';
import { cx } from '../../utils/cx';
import styles from './Artwork.module.css';

export type ArtworkRatio = 'poster' | 'thumbnail' | 'square';

interface ArtworkProps {
  readonly src?: string;
  /** Alternative text. Empty string marks the image as decorative. */
  readonly alt: string;
  /** Shown when there is no image, or the image fails to load. */
  readonly fallbackLabel: string;
  readonly ratio?: ArtworkRatio;
  /** Above-the-fold artwork should not be lazily loaded. */
  readonly priority?: boolean;
  readonly className?: string;
}

const RATIO_CLASS: Record<ArtworkRatio, string | undefined> = {
  poster: styles.poster,
  thumbnail: styles.thumbnail,
  square: styles.square,
};

/**
 * Artwork with a fixed aspect ratio and a layout-stable fallback.
 *
 * Reserving space up front prevents layout shift while provider thumbnails load
 * (design spec 25), and a failed image degrades to a labelled placeholder instead of a
 * broken-image icon (design spec 5.3).
 */
export function Artwork({
  src,
  alt,
  fallbackLabel,
  ratio = 'poster',
  priority = false,
  className,
}: ArtworkProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = src !== undefined && src.length > 0 && failedSrc !== src;

  return (
    <div className={cx(styles.artwork, RATIO_CLASS[ratio], className)}>
      {showImage ? (
        <img
          className={styles.image}
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => {
            setFailedSrc(src);
          }}
        />
      ) : (
        <div className={styles.fallback} data-testid="artwork-fallback">
          <span className={styles.fallbackLabel}>{fallbackLabel}</span>
        </div>
      )}
    </div>
  );
}
