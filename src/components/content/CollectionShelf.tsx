import { ROW_PAGE_SIZE } from '../../config/discovery';
import { useProviderServices } from '../../data/ProviderServices';
import { useAsyncValue } from '../../data/useAsyncValue';
import type { ContentCollection } from '../../models/content';
import { formatItemCount } from '../../utils/format';
import { buildCollectionPath } from '../../utils/links';
import { ItemRow } from './ItemRow';

interface CollectionShelfProps {
  readonly collection: ContentCollection;
  readonly headingLevel?: 2 | 3;
}

/**
 * A collection presented as a horizontal row of its items (design spec 5.1, 5.2).
 *
 * Browse surfaces show the content, not a folder card: the collection's own page remains the
 * place to sort, filter, and ask for more. This row is a preview with a "View all" link, so
 * opening the collection is a choice rather than a requirement. A failure is contained in the
 * row; neighbouring shelves stay usable.
 */
export function CollectionShelf({ collection, headingLevel = 2 }: CollectionShelfProps) {
  const { queries } = useProviderServices();
  const itemCount = formatItemCount(collection.itemCount);

  const { state, reload } = useAsyncValue(
    `shelf:${collection.providerId}:${collection.id}`,
    ({ signal, fresh }) =>
      queries.collectionItems(
        collection.providerId,
        collection.id,
        { page: 1, pageSize: ROW_PAGE_SIZE },
        { signal, fresh },
      ),
  );

  return (
    <ItemRow
      title={collection.title}
      headingLevel={headingLevel}
      {...(itemCount !== undefined ? { description: itemCount } : {})}
      viewAllHref={buildCollectionPath(collection.providerId, collection.id)}
      state={state}
      reload={reload}
      emptyMessage="No items in this collection. Open it to see nested collections."
    />
  );
}
