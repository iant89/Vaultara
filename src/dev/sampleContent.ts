/**
 * Sample content for the development-only design system page.
 *
 * This is synthetic fixture data, not provider content: every item uses the reserved
 * `sample` provider id so it can never be mistaken for a real Internet Archive, Wikipedia, or
 * Adult record. It is imported only by the dev-only route, so it does not ship in production
 * builds.
 */

import type { ContentCollection, ContentItem } from '../models/content';

const metadata = { synthetic: true } as const;

export const SAMPLE_ITEMS: readonly ContentItem[] = [
  {
    id: 'sample-nosferatu',
    providerId: 'sample',
    title: 'Nosferatu, eine Symphonie des Grauens',
    description: 'A silent horror film from the German Expressionist era.',
    type: 'movie',
    creator: 'F. W. Murnau',
    publicationDate: '1922',
    categories: ['films'],
    tags: ['silent', 'horror'],
    metadata,
  },
  {
    id: 'sample-lovelace-notes',
    providerId: 'sample',
    title: 'Notes on the Analytical Engine',
    description: 'Annotated notes describing a general-purpose computing machine.',
    type: 'document',
    creator: 'Ada Lovelace',
    publicationDate: '1843',
    categories: ['documents'],
    tags: ['computing', 'history'],
    metadata,
  },
  {
    id: 'sample-field-recordings',
    providerId: 'sample',
    title: 'Field Recordings of the Northern Coast',
    type: 'audio',
    creator: 'Anon.',
    publicationDate: '1958',
    categories: ['audio'],
    tags: ['field recording'],
    metadata,
  },
  {
    id: 'sample-botanical-plates',
    providerId: 'sample',
    title: 'Botanical Plates, Volume II',
    type: 'image',
    creator: 'Unknown illustrator',
    publicationDate: '1811',
    categories: ['images'],
    tags: ['botany', 'plate'],
    metadata,
  },
  {
    id: 'sample-cartridge-tales',
    providerId: 'sample',
    title: 'Cartridge Tales',
    description: 'A homebrew title prepared for the Game Boy viewer.',
    type: 'game',
    creator: 'Homebrew Collective',
    publicationDate: '2021',
    categories: ['games'],
    tags: ['game boy', 'homebrew'],
    metadata,
  },
  {
    id: 'sample-reading-primer',
    providerId: 'sample',
    title: 'The New England Primer',
    type: 'book',
    creator: 'Benjamin Harris',
    publicationDate: '1690',
    categories: ['books'],
    tags: ['education'],
    metadata,
  },
  {
    id: 'sample-very-long-title-that-wraps',
    providerId: 'sample',
    title:
      'A Considerably Overlong Title Intended to Verify Two-Line Clamping and Truncation Behaviour',
    type: 'article',
    creator: 'Editorial Board',
    publicationDate: '1899',
    categories: ['articles'],
    tags: ['typography'],
    metadata,
  },
  {
    id: 'sample-disk-image',
    providerId: 'sample',
    title: 'Workstation OS 1.2 Disk Image',
    type: 'software',
    creator: 'Unknown vendor',
    publicationDate: '1994',
    categories: ['software'],
    tags: ['disk image'],
    metadata,
  },
];

export const SAMPLE_COLLECTIONS: readonly ContentCollection[] = [
  {
    id: 'sample-silent-film',
    providerId: 'sample',
    title: 'Early Silent Cinema',
    description: 'Public-domain films from the first three decades of motion pictures.',
    itemCount: 1240,
    categoryIds: ['films'],
    metadata,
  },
  {
    id: 'sample-computing-history',
    providerId: 'sample',
    title: 'Computing History',
    itemCount: 318,
    description: 'Papers, manuals, and ephemera from the history of computing.',
    categoryIds: ['documents'],
    metadata,
  },
  {
    id: 'sample-homebrew',
    providerId: 'sample',
    title: 'Homebrew Cartridges',
    description: 'Community-built titles that may be run in the Game Boy viewer.',
    itemCount: 42,
    categoryIds: ['games'],
    metadata,
  },
  {
    id: 'sample-no-count',
    providerId: 'sample',
    title: 'Uncounted Collection',
    description: 'An item count that the provider did not report.',
    categoryIds: ['misc'],
    metadata,
  },
];
