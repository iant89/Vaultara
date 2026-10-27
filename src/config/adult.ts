/**
 * Adult provider product constants (design spec 13, roadmap Phase 16).
 *
 * The Adult provider does not introduce a separate adult-content API. It presents Internet
 * Archive items that are filed in the adults-only collection, under its own provider identity,
 * so ordinary Archive discovery never has to know those items exist.
 */

/** Registry and route id. */
export const ADULT_PROVIDER_ID = 'adult';

/**
 * Archive collection that holds Adult-scoped items.
 *
 * Membership in this collection is the only inclusion rule. The Adult adapter will not return
 * an item that is merely tagged suggestive, and the Archive adapter excludes this collection
 * from ordinary search, related items, and collection listings.
 */
export const ADULT_ARCHIVE_COLLECTION_ID = 'adultsonly';
