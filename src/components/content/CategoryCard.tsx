import { Link } from 'react-router-dom';
import type { ContentCategory } from '../../models/content';
import { buildCategoryPath } from '../../utils/links';
import { Artwork } from '../ui/Artwork';
import styles from './CategoryCard.module.css';

interface CategoryCardProps {
  readonly category: ContentCategory;
}

/**
 * One browsable category.
 *
 * The whole card is the link: a single tab stop with a large target, rather than a small title
 * link inside a decorative box. The image is representative artwork, so its alternative text is
 * empty and the heading carries the meaning.
 */
export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <li className={styles.card}>
      <Link to={buildCategoryPath(category.id)} className={styles.link}>
        <Artwork
          src={category.artworkUrl}
          alt=""
          fallbackLabel={category.name}
          ratio="thumbnail"
          className={styles.artwork}
        />
        <div className={styles.body}>
          <h3 className={styles.title}>{category.name}</h3>
          {category.description ? (
            <p className={styles.description}>{category.description}</p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}
