/**
 * Browsable Wikipedia subject areas.
 *
 * Wikipedia has no media-type tree. These entries are presentation roots (decision 54):
 * everything below them is discovered from category membership at request time.
 */

export interface WikipediaCategoryDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Wikipedia category title without the `Category:` prefix. */
  readonly wikipediaTitle: string;
}

export const WIKIPEDIA_CATEGORIES: readonly WikipediaCategoryDefinition[] = [
  {
    id: 'Featured_articles',
    name: 'Featured articles',
    description: 'Articles the community has identified as Wikipedia’s best work.',
    wikipediaTitle: 'Featured_articles',
  },
  {
    id: 'Good_articles',
    name: 'Good articles',
    description: 'Well-written, stable articles that meet the good-article criteria.',
    wikipediaTitle: 'Good_articles',
  },
  {
    id: 'Science',
    name: 'Science',
    description: 'The natural sciences, mathematics, and scientific biography.',
    wikipediaTitle: 'Science',
  },
  {
    id: 'History',
    name: 'History',
    description: 'People, places, and events from the historical record.',
    wikipediaTitle: 'History',
  },
  {
    id: 'Arts',
    name: 'Arts',
    description: 'Literature, music, film, and the visual arts.',
    wikipediaTitle: 'Arts',
  },
  {
    id: 'Geography',
    name: 'Geography',
    description: 'Places, countries, and the physical world.',
    wikipediaTitle: 'Geography',
  },
  {
    id: 'People',
    name: 'People',
    description: 'Biographies and human-interest subjects.',
    wikipediaTitle: 'People',
  },
  {
    id: 'Current_events',
    name: 'Current events',
    description: 'Articles tied to events unfolding now.',
    wikipediaTitle: 'Current_events',
  },
];

export function findWikipediaCategory(categoryId: string): WikipediaCategoryDefinition | undefined {
  const needle = categoryId.replace(/^Category:/i, '').replace(/ /g, '_');

  return WIKIPEDIA_CATEGORIES.find(
    (category) =>
      category.id.toLowerCase() === needle.toLowerCase() ||
      category.wikipediaTitle.toLowerCase() === needle.toLowerCase(),
  );
}
