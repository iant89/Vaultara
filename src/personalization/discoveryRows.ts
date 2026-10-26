/**
 * Which home-page rows a signed-in account asked to see.
 *
 * An empty selection is the useful default from skipping onboarding: every configured row.
 * Unknown ids are ignored rather than producing an empty home page.
 */

import {
  DISCOVERY_ROWS,
  FEATURED_CATEGORY_ID,
  type DiscoveryRowDefinition,
} from '../config/discovery';

export function rowsForCategories(
  selectedCategoryIds: readonly string[],
): readonly DiscoveryRowDefinition[] {
  if (selectedCategoryIds.length === 0) {
    return DISCOVERY_ROWS;
  }

  const selected = new Set(selectedCategoryIds);
  const rows = DISCOVERY_ROWS.filter((row) => selected.has(row.categoryId));

  return rows.length > 0 ? rows : DISCOVERY_ROWS;
}

export function featuredRowFor(
  rows: readonly DiscoveryRowDefinition[],
): DiscoveryRowDefinition | undefined {
  return rows.find((row) => row.categoryId === FEATURED_CATEGORY_ID) ?? rows[0];
}
